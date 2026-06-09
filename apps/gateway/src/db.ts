import { createDbClient } from "@tonsura/db";
import { env } from "./env";

// One pooled Postgres client for the whole process. (The old Cloudflare Worker
// created a fresh client per request because Workers can't hold sockets across
// invocations — on Node that's pure overhead, so this is a singleton.)
export const db = createDbClient(env.DATABASE_URL);
