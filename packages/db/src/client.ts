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
    max: options.max ?? 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(sql, { schema });
}
