import type { Context } from "hono";
import { PixelEventSchema } from "@tonsura/validators";
import { insertUsageEvent } from "@tonsura/db";
import type { AppEnv } from "../types";
import { db } from "../db";
import { dailyTokens } from "../lib/ratelimit";
import { calculateCost, calculateRevenue } from "../lib/token-extractor";

// Ingests a self-reported usage event as a usage_log with source: "pixel".
// The sub-key (Authorization: Bearer sk_...) resolves the product and pricing,
// so the body only carries what the proxy cannot know for a direct call: the
// feature, the units consumed, and optional end-user/plan tags.
export async function pixelHandler(c: Context<AppEnv>): Promise<Response> {
  const meta = c.get("subKeyMeta");

  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = PixelEventSchema.safeParse(json);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid pixel event", details: parsed.error.flatten() },
      400
    );
  }
  const ev = parsed.data;

  // Feature comes from the body, or is intrinsic to a feature key. One must be
  // present so the usage is attributable.
  const feature = ev.feature || meta.feature;
  if (!feature) {
    return c.json(
      { error: "feature is required (omit only when using a feature key)" },
      400
    );
  }

  const eventId = ev.eventId ?? crypto.randomUUID();
  const unitType = ev.unitType ?? meta.unitType;
  const units = ev.units;
  const tokensUsed = unitType === "token" ? units : 0;
  const cost = calculateCost(units, meta.costPerMillionTokens);
  const revenue = calculateRevenue(units, meta.pricePerMillionTokens);
  const margin = (parseFloat(revenue) - parseFloat(cost)).toFixed(8);

  // The unique index on event_id IS the idempotency guard: a retried postback
  // with the same eventId inserts nothing and is reported as a duplicate.
  const inserted = await insertUsageEvent(db, {
    eventId,
    subKeyId: meta.id,
    projectId: meta.projectId,
    productId: meta.productId,
    providerId: meta.providerId,
    feature,
    endUser: ev.endUser ?? "",
    plan: ev.plan ?? "",
    source: "pixel",
    endpoint: ev.endpoint,
    method: ev.method,
    statusCode: ev.statusCode,
    latencyMs: ev.latencyMs,
    unitType,
    units,
    tokensUsed,
    cost,
    revenue,
    margin,
    error: ev.error,
    timestamp: ev.timestamp ?? new Date().toISOString(),
  });

  if (!inserted) {
    return c.json({ ok: true, duplicate: true, eventId }, 202);
  }

  if (tokensUsed > 0) {
    dailyTokens.add(meta.id, tokensUsed);
  }

  return c.json({ ok: true, feature, units, unitType }, 202);
}
