import { createMiddleware } from "hono/factory";
import { hashSubKey } from "@tonsura/crypto";
import { getSubKeyByHash } from "@tonsura/db";
import type { SubKeyMeta } from "@tonsura/validators";
import type { AppEnv } from "../types";
import { db } from "../db";
import { TTLCache } from "../lib/cache";
import { dailyTokens } from "../lib/ratelimit";

// Sub-key meta cached in-process for 60s: the hot path makes zero DB calls on
// a warm key. Revocations therefore take up to 60s to bite — same window the
// old Redis cache had, without the network round trip.
const metaCache = new TTLCache<SubKeyMeta>(60_000);

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const plainKey = authHeader.slice(7).trim();
  if (!plainKey.startsWith("sk_")) {
    return c.json({ error: "Invalid key format" }, 401);
  }

  const keyHash = hashSubKey(plainKey);
  let meta = metaCache.get(keyHash);
  if (!meta) {
    const fromDb = await getSubKeyByHash(db, keyHash);
    if (!fromDb) {
      return c.json({ error: "Invalid or revoked API key" }, 401);
    }
    meta = fromDb;
    metaCache.set(keyHash, meta);
  }

  if (
    meta.dailyTokenLimit !== null &&
    dailyTokens.get(meta.id) >= meta.dailyTokenLimit
  ) {
    return c.json({ error: "Daily token limit exceeded" }, 429);
  }

  c.set("subKeyMeta", meta);
  await next();
  return;
});
