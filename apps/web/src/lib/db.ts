import { createDbClient } from "@tonsura/db";

let _db: ReturnType<typeof createDbClient> | undefined;

export function getDb() {
  if (!_db) {
    _db = createDbClient(process.env["DATABASE_URL"]!);
  }
  return _db;
}
