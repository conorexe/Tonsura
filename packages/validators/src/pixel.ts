import { z } from "zod";

// Self-reported usage event for API calls the SaaS owner makes directly to a
// provider (not through the gateway proxy). The "tracking pixel" companion to
// proxy-captured usage: same usage_logs row shape, just source: "pixel".
export const PixelEventSchema = z.object({
  // Idempotency key. Supply a stable id per logical event so a retried postback
  // is deduped instead of double-counted. Omit it and the gateway generates one
  // (each request unique → no cross-retry dedup, only queue-redelivery dedup).
  eventId: z.string().min(1).max(200).optional(),
  // Per-feature attribution tag. Optional when the key is a feature key (the
  // feature is then taken from the key); required otherwise.
  feature: z.string().min(1).max(120).optional(),
  // The SaaS's own end-user that drove this call, for per-user spend rollups.
  endUser: z.string().max(200).optional(),
  // The end-user's pricing tier/plan, for margin-by-tier rollups. Self-reported:
  // only the SaaS owner knows which plan their user is on.
  plan: z.string().max(120).optional(),
  // Billable units consumed (tokens, characters, requests, or records).
  units: z.number().int().nonnegative().default(1),
  // Optional override; defaults to the sub-key's product unitType.
  unitType: z.enum(["token", "character", "request", "record"]).optional(),
  endpoint: z.string().max(512).default("/pixel"),
  method: z.string().max(10).default("POST"),
  statusCode: z.number().int().default(200),
  latencyMs: z.number().int().nonnegative().default(0),
  error: z.string().max(512).optional(),
  timestamp: z.string().datetime().optional(),
});

export type PixelEventInput = z.infer<typeof PixelEventSchema>;
