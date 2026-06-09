// @tonsura/sdk — the "tracking pixel" client for SaaS owners.
//
// Use it to self-report per-feature API usage for calls you make directly to a
// provider (i.e. not through the Tonsura gateway proxy). For proxied calls you
// don't need track() — just attach proxyHeaders(feature) so the gateway stamps
// the feature automatically.

export type UnitType = "token" | "character" | "request" | "record";

export interface TonsuraClientOptions {
  /** Customer sub-key, e.g. "sk_live_...". */
  apiKey: string;
  /** Gateway origin, e.g. "https://gateway.tonsura.dev". */
  baseUrl: string;
  /** Feature tag applied when an individual call omits one. */
  defaultFeature?: string;
  /** Override the global fetch (e.g. node-fetch, an instrumented fetch). */
  fetch?: typeof fetch;
}

export interface TrackEvent {
  /**
   * Idempotency key. Supply a stable id per logical event so a retried report is
   * deduped server-side instead of double-counted. Defaults to a fresh UUID.
   */
  eventId?: string;
  /** Per-feature attribution tag. Falls back to the client's defaultFeature. */
  feature?: string;
  /** The SaaS's own end-user that drove this call, for per-user spend rollups. */
  endUser?: string;
  /** The end-user's pricing tier/plan, for margin-by-tier rollups. */
  plan?: string;
  /** Billable units consumed (tokens, characters, requests, or records). Defaults to 1. */
  units?: number;
  /** Override the sub-key's product unitType. */
  unitType?: UnitType;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
  /** ISO-8601 timestamp; defaults to the gateway's receive time. */
  timestamp?: string;
}

export interface TrackResult {
  ok: boolean;
  feature: string;
  units: number;
  unitType: UnitType;
}

export class TonsuraError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(message);
    this.name = "TonsuraError";
  }
}

export interface TonsuraClient {
  /** Report a usage event. Throws TonsuraError on a non-2xx response. */
  track(event: TrackEvent): Promise<TrackResult>;
  /**
   * Time and report an async operation as one usage event, returning its
   * result. Reporting is best-effort: a telemetry failure never throws, so it
   * can't break the wrapped feature.
   */
  wrap<T>(
    feature: string,
    fn: () => Promise<T>,
    opts?: {
      units?: number;
      unitType?: UnitType;
      endpoint?: string;
      endUser?: string;
    }
  ): Promise<T>;
  /**
   * Headers to attach to a proxied call so the gateway stamps the feature (and
   * optionally the end-user + plan) on the captured usage row.
   */
  proxyHeaders(
    feature?: string,
    endUser?: string,
    plan?: string
  ): Record<string, string>;
}

function newEventId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // Fallback for runtimes without crypto.randomUUID.
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createTonsuraClient(
  options: TonsuraClientOptions
): TonsuraClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetch ?? globalThis.fetch;
  if (typeof doFetch !== "function") {
    throw new Error(
      "No fetch available; pass options.fetch on this runtime."
    );
  }

  async function track(event: TrackEvent): Promise<TrackResult> {
    const feature = event.feature ?? options.defaultFeature;
    if (!feature) {
      throw new Error(
        "track() requires a feature (set one on the event or defaultFeature)."
      );
    }

    const res = await doFetch(`${baseUrl}/v1/pixel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...event,
        feature,
        eventId: event.eventId ?? newEventId(),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new TonsuraError(
        `Pixel ingest failed: ${res.status}`,
        res.status,
        body
      );
    }
    return (await res.json()) as TrackResult;
  }

  async function wrap<T>(
    feature: string,
    fn: () => Promise<T>,
    opts?: {
      units?: number;
      unitType?: UnitType;
      endpoint?: string;
      endUser?: string;
    }
  ): Promise<T> {
    const start = Date.now();
    let statusCode = 200;
    let error: string | undefined;
    try {
      return await fn();
    } catch (err) {
      statusCode = 500;
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const event: TrackEvent = {
        feature,
        units: opts?.units ?? 1,
        ...(opts?.unitType ? { unitType: opts.unitType } : {}),
        ...(opts?.endpoint ? { endpoint: opts.endpoint } : {}),
        ...(opts?.endUser ? { endUser: opts.endUser } : {}),
        statusCode,
        latencyMs: Date.now() - start,
        ...(error ? { error } : {}),
      };
      void track(event).catch(() => {
        // best-effort telemetry: never let a reporting failure surface
      });
    }
  }

  function proxyHeaders(
    feature?: string,
    endUser?: string,
    plan?: string
  ): Record<string, string> {
    const tag = feature ?? options.defaultFeature;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${options.apiKey}`,
    };
    if (tag) headers["X-Tonsura-Feature"] = tag;
    if (endUser) headers["X-Tonsura-User"] = endUser;
    if (plan) headers["X-Tonsura-Plan"] = plan;
    return headers;
  }

  return { track, wrap, proxyHeaders };
}
