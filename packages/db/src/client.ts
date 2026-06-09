import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export type DrizzleClient = ReturnType<typeof createDbClient>;

export function createDbClient(
  connectionString: string,
  options: { max?: number } = {}
) {
  const sql = postgres(connectionString, {
    prepare: false,
    // Small pool by default: Tonsura runs two processes (web + gateway) and
    // managed poolers cap total clients (Supabase session mode allows 15).
    // 5 + 5 stays comfortably under that while covering parallel page queries.
    max: options.max ?? 5,
    // Release idle connections back to the server/pooler instead of pinning
    // slots forever.
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(sql, { schema });
}
