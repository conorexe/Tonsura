import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// An upstream API (OpenAI, ElevenLabs, or any custom HTTP API). Single-tenant:
// every provider belongs to the operator.
export const providers = pgTable("providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  baseUrl: text("base_url").notNull(),
  // Selects the gateway usage extractor: openai | anthropic | elevenlabs |
  // llm (auto-detect) | generic (unmetered).
  type: text("type").notNull().default("generic"),
  // How the upstream API key is presented on each proxied request:
  //   bearer → Authorization: Bearer <key>
  //   header → <authParam>: <key>   (e.g. x-api-key, xi-api-key)
  //   query  → ?<authParam>=<key>
  authScheme: text("auth_scheme").notNull().default("bearer"),
  authParam: text("auth_param"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
