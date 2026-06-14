import { createDbClient } from "@tonsura/db";

// Stash on globalThis so the pool survives Next dev hot reloads.
const g = globalThis as unknown as {
  __tonsuraDb?: ReturnType<typeof createDbClient>;
};

export function getDb() {
  if (!g.__tonsuraDb) {
    g.__tonsuraDb = createDbClient(process.env["DATABASE_URL"]!, { max: 5 });
  }
  return g.__tonsuraDb;
}
