# Tonsura

Self-hosted API spend tracking. Meter every call to OpenAI, ElevenLabs or
anything else over HTTP, attribute the cost to a feature and an end user, and
see margin per pricing tier. Runs on your own box, against your own Postgres.

## Stack

- Node 20+, pnpm 9+ (`corepack enable`)
- Postgres 14+ (local, Docker, RDS, Supabase, Neon, whatever)

That's it. No Redis, no ClickHouse, no third-party auth.

## Install

```bash
git clone <repo> tonsura
cd tonsura
pnpm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` - Postgres connection string
- `MASTER_ENCRYPTION_SECRET` - `openssl rand -hex 32`. Encrypts upstream
  keys at rest. Don't change this after you've stored keys, they become
  unrecoverable.
- `AUTH_SECRET` - `openssl rand -hex 32`. Signs the dashboard session cookie.
- `ADMIN_PASSWORD` - whatever you want to log in with.
- `GATEWAY_PORT` - default 8787.

Push the schema:

```bash
pnpm db:push
```

## Run

```bash
pnpm dev
```

Dashboard on `:3000`, gateway on `:8787`. For production, put Caddy or nginx
in front of both and:

```bash
pnpm --filter @tonsura/web build
pnpm --filter @tonsura/web start
pnpm --filter @tonsura/gateway start
```

## Usage

Sign in at the dashboard with `ADMIN_PASSWORD`.

1. Add an upstream credential under **API Keys**. OpenAI, Anthropic,
   ElevenLabs, or anything else (give it a base URL and tell it how the API
   wants its auth header).
2. Create a **Feature** - just a group of upstreams behind one of your product
   features (e.g. `assistant`).
3. Add a **Product** to the feature, with a path alias (e.g. `chat`), a unit
   type, and cost+price per million units.
4. Issue a **feature key** under **Keys**. The `sk_...` is shown once.
5. Send traffic.

Pixel (call the provider directly, self-report after):

```bash
curl -X POST http://localhost:8787/v1/pixel \
  -H "Authorization: Bearer sk_..." \
  -H "Content-Type: application/json" \
  -d '{"units":1200,"unitType":"token","endUser":"u_42","plan":"pro","eventId":"evt-1"}'
```

Proxy (gateway forwards, meters, attributes):

```bash
curl -X POST http://localhost:8787/v1/chat/chat/completions \
  -H "Authorization: Bearer sk_..." \
  -H "X-Tonsura-User: u_42" \
  -H "X-Tonsura-Plan: pro" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'
```

`/v1/{alias}/<rest>` gets routed to `<base-url>/<rest>`.

## SDK

```ts
import { createTonsuraClient } from "@tonsura/sdk";

const tonsura = createTonsuraClient({
  apiKey: "sk_...",
  baseUrl: "http://localhost:8787",
});

await tonsura.track({ units: 1200, unitType: "token", endUser: "u_42" });

const result = await tonsura.wrap("assistant", () => callOpenAI(prompt), {
  endUser: "u_42",
});
```

## Notes

- Usage rows land in Postgres with a unique index on `event_id`, so retried
  postbacks won't double-count.
- Sub-key metadata is cached in the gateway process for 60s. Revocations take
  up to 60s to take effect.
- Rate limits and the daily token counter are in-process. One gateway process
  per deployment.
- Upstream keys are AES-256-GCM. Sub-keys are stored as SHA-256 hashes.
- Streaming JSON is buffered to read `usage`. Binary, audio, and SSE pass
  through.
- Streamed LLM responses (SSE) currently meter as 0 tokens. Pixel-report
  those, or don't stream through the proxy.

## Layout

```
apps/
  gateway/     Hono server: proxy, pixel, metering, rate limits
  web/         Next.js dashboard
packages/
  db/          Drizzle schema, queries, insight SQL
  validators/  Zod schemas shared everywhere
  crypto/      AES-256-GCM + sub-key hashing
  transform/   Request/response transformation engine
  sdk/         Pixel client
```

`pnpm test` runs the unit suite. `pnpm typecheck` checks every workspace.
