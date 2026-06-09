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

// Response headers we never copy back from the upstream — either hop-by-hop or
// values that won't match our (possibly transformed / re-streamed) body.
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

// JSON responses are the only ones we buffer + parse (to read a `usage` object
// and optionally transform the body). Anything else — binary audio (ElevenLabs
// TTS), image bytes, streamed SSE — must pass straight through to avoid
// corrupting the payload, with usage derived from the request + headers instead.
function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json") || ct.includes("+json");
}

export async function proxyHandler(c: Context<AppEnv>): Promise<Response> {
  const meta = c.get("subKeyMeta");
  const start = Date.now();

  // Resolve which root-API binding this call targets. Feature keys route by the
  // path alias (/v1/{alias}/...); single-product keys have one binding and
  // forward the full path. A feature key with an unrecognized alias is a 404.
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
      // pass through non-JSON bodies
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

  // Preserve the caller's query string — many APIs are parameterized entirely
  // through it (the old proxy silently dropped it).
  const search = new URL(c.req.url).search;
  let upstreamUrl =
    buildUpstreamUrl(binding.providerBaseUrl, route.upstreamPath) + search;

  // Remove hop-by-hop headers and swap auth
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

  // Inject the upstream credential the way the provider expects: Bearer, a
  // custom header (x-api-key, xi-api-key, ...), or a query param.
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

  // Did the request body actually change? If not, forward the original bytes
  // verbatim (preserves exact content for providers that are byte-sensitive).
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

  // Only buffer JSON; everything else streams straight through unread so binary
  // / SSE payloads aren't corrupted.
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

  // Count billable units with the provider-specific extractor, which sees the
  // request, the (JSON) response, and the response headers. Character-billed
  // providers (ElevenLabs) read the request text; token-billed providers read
  // the response `usage`.
  const billable = extractUnits(binding.providerType, {
    requestBody: txBody,
    responseBody: resBody,
    requestText: rawBody || undefined,
    responseHeaders: upstreamRes.headers,
  });

  // Metered unit types (token/character) bill the extracted count; per-call
  // unit types (request/record) bill one unit per call. Cost/revenue are
  // per-million-units in every case.
  const metered =
    binding.unitType === "token" || binding.unitType === "character";
  const units = metered ? billable : 1;
  const cost = calculateCost(units, binding.costPerMillionTokens);
  const revenue = calculateRevenue(units, binding.pricePerMillionTokens);
  const margin = (parseFloat(revenue) - parseFloat(cost)).toFixed(8);
  const latencyMs = Date.now() - start;

  // Attribution: a feature key stamps its own feature intrinsically; headers
  // are overrides / the only way for single-product keys. End-user + plan are
  // per-request tags only the caller knows.
  const feature = meta.feature || c.req.header("X-Tonsura-Feature") || "";
  const endUser = c.req.header("X-Tonsura-User") ?? "";
  const plan = c.req.header("X-Tonsura-Plan") ?? "";

  if (billable > 0 && binding.unitType === "token") {
    dailyTokens.add(meta.id, billable);
  }

  // Fire-and-forget: don't hold the response for the usage write. The unique
  // event_id index makes a retried write idempotent.
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

  // Non-JSON: stream the upstream body back untouched (binary audio, SSE, ...).
  if (!jsonResponse) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: passthroughResponseHeaders(upstreamRes.headers),
    });
  }

  // JSON but unparseable — return the raw text as-is.
  if (resBody === undefined) {
    return new Response(resText ?? "", {
      status: upstreamRes.status,
      headers: passthroughResponseHeaders(upstreamRes.headers),
    });
  }

  const txResBody = transformResponse(resBody, binding.transformConfig);
  return Response.json(txResBody, { status: upstreamRes.status });
}
