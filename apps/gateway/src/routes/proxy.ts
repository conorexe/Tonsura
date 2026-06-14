import type { Context } from "hono";
import { decryptKey } from "@tonsura/crypto";
import { transformRequest, transformResponse } from "@tonsura/transform";
import { insertUsageEvent } from "@tonsura/db";
import type { AppEnv } from "../types";
import { env } from "../env";
import { db } from "../db";
import { buildUpstreamUrl } from "../lib/upstream-url";
import { resolveRoute } from "../lib/binding-router";
import { dailyTokens } from "../lib/ratelimit";
import {
  extractUnits,
  calculateCost,
  calculateRevenue,
} from "../lib/token-extractor";

const STRIP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "upgrade",
  "content-encoding",
  "content-length",
]);

function passthroughResponseHeaders(upstream: Headers): Headers {
  const out = new Headers();
  upstream.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) out.set(key, value);
  });
  return out;
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json") || ct.includes("+json");
}

export async function proxyHandler(c: Context<AppEnv>): Promise<Response> {
  const meta = c.get("subKeyMeta");
  const start = Date.now();

  const route = resolveRoute(meta, c.req.path);
  if (!route) {
    return c.json(
      { error: "Unknown API alias for this key", path: c.req.path },
      404
    );
  }
  const binding = route.binding;

  const rawBody = await c.req.text();
  let parsedBody: Record<string, unknown> = {};
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      // non-JSON body, pass through
    }
  }

  const { body: txBody, headers: txHeaders } = transformRequest(
    parsedBody,
    c.req.raw.headers,
    binding.transformConfig,
    binding.providerType
  );

  const masterKey = decryptKey(
    binding.encryptedMasterKey,
    env.MASTER_ENCRYPTION_SECRET
  );

  const search = new URL(c.req.url).search;
  let upstreamUrl =
    buildUpstreamUrl(binding.providerBaseUrl, route.upstreamPath) + search;

  const forwardHeaders: Record<string, string> = {};
  const skipHeaders = new Set([
    "authorization",
    "connection",
    "keep-alive",
    "transfer-encoding",
    "te",
    "upgrade",
    "proxy-authorization",
    "proxy-connection",
    "host",
    "content-length",
  ]);
  for (const [k, v] of Object.entries(txHeaders)) {
    if (!skipHeaders.has(k.toLowerCase())) forwardHeaders[k] = v;
  }

  const authScheme = binding.authScheme ?? "bearer";
  if (authScheme === "header" && binding.authParam) {
    forwardHeaders[binding.authParam] = masterKey;
  } else if (authScheme === "query" && binding.authParam) {
    const u = new URL(upstreamUrl);
    u.searchParams.set(binding.authParam, masterKey);
    upstreamUrl = u.toString();
  } else {
    forwardHeaders["Authorization"] = `Bearer ${masterKey}`;
  }

  const bodyChanged = JSON.stringify(txBody) !== rawBody;
  const outgoingBody = rawBody
    ? bodyChanged
      ? JSON.stringify(txBody)
      : rawBody
    : undefined;
  if (outgoingBody !== undefined && !forwardHeaders["Content-Type"]) {
    forwardHeaders["Content-Type"] = "application/json";
  }

  const upstreamRes = await fetch(upstreamUrl, {
    method: c.req.method,
    headers: forwardHeaders,
    body: outgoingBody,
  });

  const jsonResponse = isJsonResponse(upstreamRes);

  let resBody: Record<string, unknown> | undefined;
  let resText: string | undefined;
  if (jsonResponse) {
    resText = await upstreamRes.text();
    try {
      resBody = JSON.parse(resText) as Record<string, unknown>;
    } catch {
      resBody = undefined;
    }
  }

  const billable = extractUnits(binding.providerType, {
    requestBody: txBody,
    responseBody: resBody,
    requestText: rawBody || undefined,
    responseHeaders: upstreamRes.headers,
  });

  const metered =
    binding.unitType === "token" || binding.unitType === "character";
  const units = metered ? billable : 1;
  const cost = calculateCost(units, binding.costPerMillionTokens);
  const revenue = calculateRevenue(units, binding.pricePerMillionTokens);
  const margin = (parseFloat(revenue) - parseFloat(cost)).toFixed(8);
  const latencyMs = Date.now() - start;

  const feature = meta.feature || c.req.header("X-Tonsura-Feature") || "";
  const endUser = c.req.header("X-Tonsura-User") ?? "";
  const plan = c.req.header("X-Tonsura-Plan") ?? "";

  if (billable > 0 && binding.unitType === "token") {
    dailyTokens.add(meta.id, billable);
  }

  void insertUsageEvent(db, {
    eventId: crypto.randomUUID(),
    subKeyId: meta.id,
    projectId: meta.projectId,
    productId: binding.productId,
    providerId: binding.providerId,
    feature,
    endUser,
    plan,
    source: "proxy",
    endpoint: new URL(upstreamUrl).pathname,
    method: c.req.method,
    statusCode: upstreamRes.status,
    latencyMs,
    unitType: binding.unitType,
    units,
    tokensUsed: binding.unitType === "token" ? billable : 0,
    cost,
    revenue,
    margin,
    timestamp: new Date().toISOString(),
  }).catch((err) => console.error("usage write failed:", err));

  if (!jsonResponse) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: passthroughResponseHeaders(upstreamRes.headers),
    });
  }

  if (resBody === undefined) {
    return new Response(resText ?? "", {
      status: upstreamRes.status,
      headers: passthroughResponseHeaders(upstreamRes.headers),
    });
  }

  const txResBody = transformResponse(resBody, binding.transformConfig);
  return Response.json(txResBody, { status: upstreamRes.status });
}
