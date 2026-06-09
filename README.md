# Tonsura

**Self-hosted API spend tracking for SaaS owners.**

Tonsura tells you where your API money goes. Every call to OpenAI, ElevenLabs,
or any other HTTP API gets metered, priced, and attributed across four
dimensions:

| Dimension | What it answers |
|---|---|
| **Root API** | Which upstream provider is burning the budget? |
| **Feature** | Which of *my product's features* drives that spend? |
| **End-user** | Which of *my users* costs the most? |
| **Tier/plan** | Is the Pro plan actually profitable per user? |

You install it on your own server. Your usage data, API keys, and margins
never leave your infrastructure.

---

## How it works

Two ingestion paths feed one Postgres table (`usage_logs`), and the dashboard
reads from it:

```
                       ┌──────────────────────────┐
  your app ──────────► │  gateway (port 8787)     │ ──► upstream API
  (proxy: swap the     │  · auth via sk_ keys     │     (OpenAI, ...)
   base URL)           │  · meters tokens/chars   │
                       │  · injects your real key │
  your backend ──────► │  POST /v1/pixel          │
  (pixel: self-report  └────────────┬─────────────┘
   after direct calls)              │
                                    ▼
                              Postgres (usage_logs)
                                    ▲
                       ┌────────────┴─────────────┐
                       │  dashboard (port 3000)   │
                       │  password-protected      │
                       └──────────────────────────┘
```

- **Pixel (recommended start):** call providers directly as you do today, then
  self-report usage with one POST (or the tiny `@tonsura/sdk`). No traffic
  rerouting, no key sharing. Idempotent via `eventId`.
- **Proxy (full capture):** point your provider SDK's base URL at the gateway.
  It swaps in your real (encrypted-at-rest) key, forwards the call — streaming
  audio/SSE included — counts tokens/characters, and logs cost/revenue/margin.
  Rate limits (RPM/RPD) and daily token caps are enforced per key.

A **feature key** can bundle several upstreams: `/v1/chat/...` routes to
OpenAI, `/v1/tts/...` to ElevenLabs — one key, the feature stamped on every
usage row automatically.

---

## Requirements

- **Node.js ≥ 20** and **pnpm ≥ 9** (`corepack enable`)
- **PostgreSQL 14+** — local, Docker, or managed (Supabase/RDS/Neon all work)

That's the whole stack. No Redis, no ClickHouse, no third-party auth.

## Install

```bash
git clone <your-repo-url> tonsura && cd tonsura
pnpm install
```

### Configure

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | What |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `MASTER_ENCRYPTION_SECRET` | `openssl rand -hex 32` — encrypts your upstream API keys (AES-256-GCM). **Changing it later makes stored keys undecryptable.** |
| `AUTH_SECRET` | `openssl rand -hex 32` — signs dashboard session cookies |
| `ADMIN_PASSWORD` | The dashboard login password |
| `GATEWAY_PORT` | Gateway port (default 8787) |

### Create the database schema

```bash
pnpm db:push
```

### Run

```bash
pnpm dev        # both apps with hot reload (development)
```

Production (e.g. under systemd, pm2, or two tmux panes):

```bash
pnpm --filter @tonsura/web build
pnpm --filter @tonsura/web start       # dashboard on :3000
pnpm --filter @tonsura/gateway start   # gateway on :8787
```

Put a reverse proxy (Caddy/nginx) with TLS in front of both ports. The
dashboard is password-protected; the gateway authenticates every request with
`sk_` keys.

---

## First 10 minutes

1. **Sign in** at `http://localhost:3000` with `ADMIN_PASSWORD`.
2. **API Keys** → add an upstream credential.
   - OpenAI: base URL `https://api.openai.com/v1`, metering *OpenAI*, auth *Bearer*.
   - ElevenLabs: base URL `https://api.elevenlabs.io/v1`, metering *ElevenLabs*,
     auth *Custom header* → `xi-api-key`.
   - Anything else: any base URL, any auth scheme, *Generic* (per-request) or
     *auto-detect LLM* metering.
3. **Features** → create one (e.g. `assistant`). A feature groups the root
   APIs behind one of your product's features.
4. **Products** → bind the API key into the feature with a **path alias**
   (e.g. `chat`), a unit type, and your cost + price per million units.
5. **Keys** → issue a **feature key**. Copy the `sk_...` — it's shown once.
6. Send usage:

   **Pixel** (self-report a call you made directly):
   ```bash
   curl -X POST http://localhost:8787/v1/pixel \
     -H "Authorization: Bearer sk_..." \
     -H "Content-Type: application/json" \
     -d '{"units":1200,"unitType":"token","endUser":"u_42","plan":"pro","eventId":"evt-1"}'
   ```
   (With a feature key the feature is stamped automatically; otherwise pass
   `"feature": "assistant"`.)

   **Proxy** (full capture — note the alias prefix):
   ```bash
   curl -X POST http://localhost:8787/v1/chat/chat/completions \
     -H "Authorization: Bearer sk_..." \
     -H "Content-Type: application/json" \
     -H "X-Tonsura-User: u_42" -H "X-Tonsura-Plan: pro" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'
   ```
   `/v1/{alias}/<provider-path>` → `<base-url>/<provider-path>`. Query strings
   are forwarded.

7. **Insights** shows spend by feature / root API / end-user / tier;
   **Dashboard** and **Analytics** show margin trend, volume, latency
   percentiles, and per-key P&L.

### SDK

```ts
import { createTonsuraClient } from "@tonsura/sdk";

const tonsura = createTonsuraClient({
  apiKey: "sk_...",
  baseUrl: "http://localhost:8787",
});

// Self-report (pixel)
await tonsura.track({ units: 1200, unitType: "token", endUser: "u_42", plan: "pro" });

// Or wrap any async call — timing, errors, best-effort reporting
const result = await tonsura.wrap("assistant", () => callOpenAI(prompt), {
  endUser: "u_42",
});

// Or attach headers to a proxied call
fetch(gatewayUrl, { headers: tonsura.proxyHeaders("assistant", "u_42", "pro") });
```

---

## Architecture notes

- **One database.** Usage events land in Postgres with a unique index on
  `event_id` — `INSERT ... ON CONFLICT DO NOTHING` makes every write
  idempotent (retried postbacks can't double-count revenue). At self-hosted
  volumes (millions of rows) Postgres handles the analytics queries fine; if
  you outgrow it, that's a good problem.
- **In-process caching + rate limiting.** Sub-key metadata is cached in the
  gateway process for 60s (revocations take up to 60s to bite). RPM/RPD use
  fixed windows in memory. This assumes **one gateway process** — the normal
  self-hosted topology. Scaling to multiple instances would need a shared
  store; that's deliberate scope-cutting, not an oversight.
- **Key security.** Upstream keys are AES-256-GCM encrypted with
  `MASTER_ENCRYPTION_SECRET` and only decrypted in the gateway when forwarding.
  Sub-keys are stored as SHA-256 hashes; plaintext is shown once at creation.
- **Streaming-safe proxy.** Only JSON responses are buffered (to read `usage`
  and apply transforms). Binary audio, images, and SSE stream through
  untouched.
- **Metering per provider type:** `openai`/`anthropic` read the response
  `usage` object; `elevenlabs` counts request characters (header-preferred);
  `llm` auto-detects common token shapes; `generic` bills per request.

## Known limitations

- **Streamed LLM responses** (SSE) currently meter 0 tokens — counting them
  needs stream teeing. Pixel-report those calls, or disable streaming through
  the proxy.
- **Rate limits and caches are per-process** (see above).
- Pixel `units` are **self-reported and trusted**; there's no reconciliation
  against the provider's actual bill.
- Single operator account; no roles or multi-user.
- No product edit UI yet (`PATCH /api/products?id=...` exists; the form
  doesn't).

## Repository layout

```
apps/
  gateway/     Node (Hono) usage gateway — proxy, pixel, metering, limits
  web/         Next.js dashboard — password auth, insights, key management
packages/
  db/          Drizzle schema + queries + insight SQL (single source of truth)
  validators/  Zod schemas shared by gateway, web, and SDK
  crypto/      AES-256-GCM key encryption, sub-key hashing/generation
  transform/   Request/response transformation engine for proxied calls
  sdk/         Dependency-free client for pixel reporting (@tonsura/sdk)
```

`pnpm test` runs the unit suite (metering, routing, rate limiting);
`pnpm typecheck` checks every workspace.
