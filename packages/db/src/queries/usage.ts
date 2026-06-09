import { sql } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { usageLogs } from "../schema/index";

// ---------------------------------------------------------------------------
// Write path
// ---------------------------------------------------------------------------

// One billable event, as produced by the gateway (proxy or pixel) or the SDK.
export interface UsageEvent {
  eventId: string;
  subKeyId: string;
  projectId?: string | null;
  productId: string;
  providerId: string;
  feature?: string;
  endUser?: string;
  plan?: string;
  source?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  unitType?: string;
  units?: number;
  tokensUsed: number;
  cost: string;
  revenue: string;
  margin: string;
  error?: string;
  timestamp?: string;
}

// Insert one usage event. The unique index on event_id makes this idempotent:
// a retried postback or duplicate fire becomes a no-op. Returns whether the
// row was actually written (false = duplicate).
export async function insertUsageEvent(
  db: DrizzleClient,
  event: UsageEvent
): Promise<boolean> {
  const rows = await db
    .insert(usageLogs)
    .values({
      eventId: event.eventId,
      subKeyId: event.subKeyId,
      projectId: event.projectId ?? null,
      productId: event.productId,
      providerId: event.providerId,
      feature: event.feature ?? "",
      endUser: event.endUser ?? "",
      plan: event.plan ?? "",
      source: event.source ?? "proxy",
      endpoint: event.endpoint,
      method: event.method,
      statusCode: event.statusCode,
      latencyMs: event.latencyMs,
      unitType: event.unitType ?? "token",
      units: event.units ?? event.tokensUsed,
      tokensUsed: event.tokensUsed,
      cost: event.cost,
      revenue: event.revenue,
      margin: event.margin,
      error: event.error ?? null,
      ...(event.timestamp ? { timestamp: new Date(event.timestamp) } : {}),
    })
    .onConflictDoNothing({ target: usageLogs.eventId })
    .returning({ id: usageLogs.id });
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Insight queries (all windows are relative to now())
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

async function run(db: DrizzleClient, query: ReturnType<typeof sql>) {
  return (await db.execute(query)) as unknown as Row[];
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const str = (v: unknown): string => (v == null ? "" : String(v));

export interface SummaryPL {
  totalCost: number;
  totalRevenue: number;
  totalMargin: number;
  totalRequests: number;
  totalTokens: number;
}

export async function summaryPL(
  db: DrizzleClient,
  days = 30
): Promise<SummaryPL> {
  const rows = await run(
    db,
    sql`SELECT
          COALESCE(SUM(cost), 0)::float8    AS total_cost,
          COALESCE(SUM(revenue), 0)::float8 AS total_revenue,
          COALESCE(SUM(margin), 0)::float8  AS total_margin,
          COUNT(*)::int                     AS total_requests,
          COALESCE(SUM(tokens_used), 0)::float8 AS total_tokens
        FROM usage_logs
        WHERE timestamp > now() - make_interval(days => ${days})`
  );
  const r = rows[0] ?? {};
  return {
    totalCost: num(r["total_cost"]),
    totalRevenue: num(r["total_revenue"]),
    totalMargin: num(r["total_margin"]),
    totalRequests: num(r["total_requests"]),
    totalTokens: num(r["total_tokens"]),
  };
}

export interface DailyMargin {
  day: string;
  revenue: number;
  cost: number;
  margin: number;
}

export async function dailyMarginTrend(
  db: DrizzleClient,
  days = 30
): Promise<DailyMargin[]> {
  const rows = await run(
    db,
    sql`SELECT
          date_trunc('day', timestamp)::date::text AS day,
          COALESCE(SUM(revenue), 0)::float8 AS revenue,
          COALESCE(SUM(cost), 0)::float8    AS cost,
          COALESCE(SUM(margin), 0)::float8  AS margin
        FROM usage_logs
        WHERE timestamp > now() - make_interval(days => ${days})
        GROUP BY 1 ORDER BY 1 ASC`
  );
  return rows.map((r) => ({
    day: str(r["day"]),
    revenue: num(r["revenue"]),
    cost: num(r["cost"]),
    margin: num(r["margin"]),
  }));
}

export interface VolumePoint {
  hour: string;
  requests: number;
  errors: number;
  tokens: number;
}

export async function requestVolumeSeries(
  db: DrizzleClient,
  hours = 24
): Promise<VolumePoint[]> {
  const rows = await run(
    db,
    sql`SELECT
          to_char(date_trunc('hour', timestamp), 'YYYY-MM-DD HH24:MI') AS hour,
          COUNT(*)::int AS requests,
          COUNT(*) FILTER (WHERE status_code >= 500)::int AS errors,
          COALESCE(SUM(tokens_used), 0)::float8 AS tokens
        FROM usage_logs
        WHERE timestamp > now() - make_interval(hours => ${hours})
        GROUP BY 1 ORDER BY 1 ASC`
  );
  return rows.map((r) => ({
    hour: str(r["hour"]),
    requests: num(r["requests"]),
    errors: num(r["errors"]),
    tokens: num(r["tokens"]),
  }));
}

export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

export async function latencyPercentiles(
  db: DrizzleClient,
  hours = 24
): Promise<LatencyPercentiles> {
  const rows = await run(
    db,
    sql`SELECT
          COALESCE(percentile_cont(0.5)  WITHIN GROUP (ORDER BY latency_ms), 0)::float8 AS p50,
          COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::float8 AS p95,
          COALESCE(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms), 0)::float8 AS p99
        FROM usage_logs
        WHERE timestamp > now() - make_interval(hours => ${hours})`
  );
  const r = rows[0] ?? {};
  return {
    p50: Math.round(num(r["p50"])),
    p95: Math.round(num(r["p95"])),
    p99: Math.round(num(r["p99"])),
  };
}

export interface SubKeyPL {
  subKeyId: string;
  requests: number;
  avgLatency: number;
  errors: number;
  revenue: number;
  cost: number;
  margin: number;
  tokens: number;
}

export async function perSubKeyPL(
  db: DrizzleClient,
  days = 30
): Promise<SubKeyPL[]> {
  const rows = await run(
    db,
    sql`SELECT
          sub_key_id::text AS sub_key_id,
          COUNT(*)::int AS requests,
          COALESCE(AVG(latency_ms), 0)::float8 AS avg_latency,
          COUNT(*) FILTER (WHERE status_code >= 500)::int AS errors,
          COALESCE(SUM(revenue), 0)::float8 AS revenue,
          COALESCE(SUM(cost), 0)::float8    AS cost,
          COALESCE(SUM(margin), 0)::float8  AS margin,
          COALESCE(SUM(tokens_used), 0)::float8 AS tokens
        FROM usage_logs
        WHERE timestamp > now() - make_interval(days => ${days})
        GROUP BY sub_key_id ORDER BY margin DESC`
  );
  return rows.map((r) => ({
    subKeyId: str(r["sub_key_id"]),
    requests: num(r["requests"]),
    avgLatency: Math.round(num(r["avg_latency"])),
    errors: num(r["errors"]),
    revenue: num(r["revenue"]),
    cost: num(r["cost"]),
    margin: num(r["margin"]),
    tokens: num(r["tokens"]),
  }));
}

export interface FeatureSpend {
  feature: string;
  requests: number;
  units: number;
  cost: number;
  revenue: number;
  margin: number;
}

export async function spendByFeature(
  db: DrizzleClient,
  days = 30
): Promise<FeatureSpend[]> {
  const rows = await run(
    db,
    sql`SELECT
          feature,
          COUNT(*)::int AS requests,
          COALESCE(SUM(units), 0)::float8   AS units,
          COALESCE(SUM(cost), 0)::float8    AS cost,
          COALESCE(SUM(revenue), 0)::float8 AS revenue,
          COALESCE(SUM(margin), 0)::float8  AS margin
        FROM usage_logs
        WHERE timestamp > now() - make_interval(days => ${days})
        GROUP BY feature ORDER BY cost DESC`
  );
  return rows.map((r) => ({
    feature: str(r["feature"]),
    requests: num(r["requests"]),
    units: num(r["units"]),
    cost: num(r["cost"]),
    revenue: num(r["revenue"]),
    margin: num(r["margin"]),
  }));
}

export interface ProviderSpend {
  providerId: string;
  requests: number;
  cost: number;
  revenue: number;
  margin: number;
}

export async function spendByProvider(
  db: DrizzleClient,
  days = 30
): Promise<ProviderSpend[]> {
  const rows = await run(
    db,
    sql`SELECT
          provider_id::text AS provider_id,
          COUNT(*)::int AS requests,
          COALESCE(SUM(cost), 0)::float8    AS cost,
          COALESCE(SUM(revenue), 0)::float8 AS revenue,
          COALESCE(SUM(margin), 0)::float8  AS margin
        FROM usage_logs
        WHERE timestamp > now() - make_interval(days => ${days})
        GROUP BY provider_id ORDER BY cost DESC`
  );
  return rows.map((r) => ({
    providerId: str(r["provider_id"]),
    requests: num(r["requests"]),
    cost: num(r["cost"]),
    revenue: num(r["revenue"]),
    margin: num(r["margin"]),
  }));
}

export interface UserUsage {
  endUser: string;
  features: number;
  requests: number;
  units: number;
  cost: number;
  revenue: number;
  margin: number;
  lastSeen: string;
}

// Per end-user spend rollup. Excludes unattributed traffic (end_user = '').
export async function usageByUser(
  db: DrizzleClient,
  opts: { days?: number; limit?: number } = {}
): Promise<UserUsage[]> {
  const days = opts.days ?? 30;
  const limit = opts.limit ?? 10;
  const rows = await run(
    db,
    sql`SELECT
          end_user,
          COUNT(DISTINCT feature)::int AS features,
          COUNT(*)::int AS requests,
          COALESCE(SUM(units), 0)::float8   AS units,
          COALESCE(SUM(cost), 0)::float8    AS cost,
          COALESCE(SUM(revenue), 0)::float8 AS revenue,
          COALESCE(SUM(margin), 0)::float8  AS margin,
          MAX(timestamp)::text AS last_seen
        FROM usage_logs
        WHERE timestamp > now() - make_interval(days => ${days})
          AND end_user <> ''
        GROUP BY end_user ORDER BY cost DESC
        LIMIT ${limit}`
  );
  return rows.map((r) => ({
    endUser: str(r["end_user"]),
    features: num(r["features"]),
    requests: num(r["requests"]),
    units: num(r["units"]),
    cost: num(r["cost"]),
    revenue: num(r["revenue"]),
    margin: num(r["margin"]),
    lastSeen: str(r["last_seen"]),
  }));
}

export interface PlanMargin {
  plan: string;
  users: number;
  requests: number;
  cost: number;
  revenue: number;
  margin: number;
}

// Margin per self-reported tier/plan (X-Tonsura-Plan header or pixel `plan`).
export async function marginByPlan(
  db: DrizzleClient,
  days = 30
): Promise<PlanMargin[]> {
  const rows = await run(
    db,
    sql`SELECT
          plan,
          COUNT(DISTINCT end_user) FILTER (WHERE end_user <> '')::int AS users,
          COUNT(*)::int AS requests,
          COALESCE(SUM(cost), 0)::float8    AS cost,
          COALESCE(SUM(revenue), 0)::float8 AS revenue,
          COALESCE(SUM(margin), 0)::float8  AS margin
        FROM usage_logs
        WHERE timestamp > now() - make_interval(days => ${days})
        GROUP BY plan ORDER BY margin DESC`
  );
  return rows.map((r) => ({
    plan: str(r["plan"]),
    users: num(r["users"]),
    requests: num(r["requests"]),
    cost: num(r["cost"]),
    revenue: num(r["revenue"]),
    margin: num(r["margin"]),
  }));
}
