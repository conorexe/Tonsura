import {
  bigint,
  bigserial,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// One row per billable event (proxied call or self-reported pixel postback).
//
// Deliberately FK-free: this is the hot write path, and rows must outlive the
// products/keys they reference. The unique index on event_id IS the idempotency
// mechanism — a retried postback or double-fired insert becomes ON CONFLICT DO
// NOTHING instead of a duplicate row. (This single index replaces the previous
// Redis SET NX + ClickHouse ReplacingMergeTree double machinery.)
export const usageLogs = pgTable(
  "usage_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    // Idempotency key. Client-supplied for postbacks, gateway-generated for
    // proxy calls.
    eventId: text("event_id").notNull(),
    subKeyId: uuid("sub_key_id").notNull(),
    projectId: uuid("project_id"),
    productId: uuid("product_id").notNull(),
    providerId: uuid("provider_id").notNull(),
    // Per-feature attribution tag (the "tracking pixel" dimension).
    feature: text("feature").notNull().default(""),
    // The SaaS's own end-user that drove this call (X-Tonsura-User).
    endUser: text("end_user").notNull().default(""),
    // The end-user's tier/plan (X-Tonsura-Plan or pixel `plan`), self-reported.
    plan: text("plan").notNull().default(""),
    // "proxy" (gateway-captured) or "pixel" (self-reported).
    source: text("source").notNull().default("proxy"),
    endpoint: text("endpoint").notNull().default(""),
    method: text("method").notNull().default(""),
    statusCode: integer("status_code").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    unitType: text("unit_type").notNull().default("token"),
    units: bigint("units", { mode: "number" }).notNull().default(0),
    tokensUsed: integer("tokens_used").notNull().default(0),
    cost: numeric("cost", { precision: 18, scale: 8 }).notNull().default("0"),
    revenue: numeric("revenue", { precision: 18, scale: 8 })
      .notNull()
      .default("0"),
    margin: numeric("margin", { precision: 18, scale: 8 })
      .notNull()
      .default("0"),
    error: text("error"),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    eventIdx: uniqueIndex("usage_logs_event_id_idx").on(t.eventId),
    tsIdx: index("usage_logs_ts_idx").on(t.timestamp),
    featureIdx: index("usage_logs_feature_idx").on(t.feature, t.timestamp),
    providerIdx: index("usage_logs_provider_idx").on(t.providerId, t.timestamp),
    endUserIdx: index("usage_logs_end_user_idx").on(t.endUser),
  })
);

export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;
