export type UnitType = "token" | "character" | "request" | "record";

export interface TonsuraClientOptions {
  apiKey: string;
  baseUrl: string;
  defaultFeature?: string;
  fetch?: typeof fetch;
}

export interface TrackEvent {
  eventId?: string;
  feature?: string;
  endUser?: string;
  plan?: string;
  units?: number;
  unitType?: UnitType;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
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
  track(event: TrackEvent): Promise<TrackResult>;
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
  proxyHeaders(
    feature?: string,
    endUser?: string,
    plan?: string
  ): Record<string, string>;
}

function newEventId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createTonsuraClient(
  options: TonsuraClientOptions
): TonsuraClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetch ?? globalThis.fetch;
  if (typeof doFetch !== "function") {
    throw new Error("No fetch available; pass options.fetch on this runtime.");
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
      void track(event).catch(() => {});
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
