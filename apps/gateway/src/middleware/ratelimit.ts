import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";
import { rpmLimiter, rpdLimiter } from "../lib/ratelimit";

export const rateLimitMiddleware = createMiddleware<AppEnv>(
  async (c, next) => {
    const meta = c.get("subKeyMeta");

    const rpm = rpmLimiter.hit(meta.id, meta.rpmLimit);
    if (!rpm.ok) {
      return c.json({ error: "Rate limit exceeded", type: "rpm" }, 429, {
        "Retry-After": "60",
      });
    }

    const rpd = rpdLimiter.hit(meta.id, meta.rpdLimit);
    if (!rpd.ok) {
      return c.json(
        { error: "Daily request limit exceeded", type: "rpd" },
        429,
        { "Retry-After": "86400" }
      );
    }

    c.header("X-RateLimit-Remaining", String(rpm.remaining));
    await next();
    return;
  }
);
