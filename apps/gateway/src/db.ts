import { createDbClient } from "@tonsura/db";
import { env } from "./env";

// One pooled Postgres client for the whole process. (The old Cloudflare Worker
// created a fresh client per request because Workers can't hold sockets across
// invocations — on Node that's pure overhead, so this is a singleton.)
// max 5: combined with the web app's 5 this stays under managed poolers'
// client caps (Supabase session mode allows 15 total).
export const db = createDbClient(env.DATABASE_URL, { max: 5 });
