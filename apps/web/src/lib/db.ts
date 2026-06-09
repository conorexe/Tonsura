import { createDbClient } from "@tonsura/db";

// One pool per process — stashed on globalThis so it survives Next.js dev
// hot-reloads. Module-level state is re-evaluated on every HMR cycle, which
// used to leak a fresh connection pool (and exhaust the Postgres pooler's
// client cap) each time a file changed.
const g = globalThis as unknown as {
  __tonsuraDb?: ReturnType<typeof createDbClient>;
};

export function getDb() {
  if (!g.__tonsuraDb) {
    g.__tonsuraDb = createDbClient(process.env["DATABASE_URL"]!, { max: 5 });
  }
  return g.__tonsuraDb;
}
