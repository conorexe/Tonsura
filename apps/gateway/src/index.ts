import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import type { AppEnv } from "./types";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/ratelimit";
import { proxyHandler } from "./routes/proxy";
import { pixelHandler } from "./routes/pixel";

const app = new Hono<AppEnv>();

app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }));

// Self-reported usage ingest (the "tracking pixel"). Registered before the
// proxy catch-all so it isn't swallowed by /v1/*. Auth resolves the sub-key
// for pricing; no proxy rate limiter since nothing is forwarded upstream.
app.post("/v1/pixel", authMiddleware, pixelHandler);

app.all("/v1/*", authMiddleware, rateLimitMiddleware, proxyHandler);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`tonsura gateway listening on http://localhost:${info.port}`);
});
