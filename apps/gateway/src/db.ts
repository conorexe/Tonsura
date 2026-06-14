import { createDbClient } from "@tonsura/db";
import { env } from "./env";

export const db = createDbClient(env.DATABASE_URL, { max: 5 });
