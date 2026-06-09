import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { TransformConfig } from "@tonsura/validators";
import { masterKeys } from "./master-keys";
import { projects } from "./projects";

// A priced binding of one master key (upstream) — optionally into a feature
// (project), where its pathAlias makes it routable by feature keys.
export const apiProducts = pgTable(
  "api_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id),
    masterKeyId: uuid("master_key_id")
      .references(() => masterKeys.id)
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug").notNull().unique(),
    // The URL segment that selects this root-API binding within a feature, e.g.
    // a "voice" feature can bind OpenAI under alias "chat" and ElevenLabs under
    // "tts". A call to /v1/{pathAlias}/... routes here. NULL = not alias-routable.
    pathAlias: text("path_alias"),
    // token | character | request | record — the unit the price/cost columns
    // below meter on.
    unitType: text("unit_type").notNull().default("token"),
    // Price/cost are per *million units* of unitType (not tokens specifically),
    // so per-request APIs and per-token LLMs share one schema.
    pricePerMillionTokens: numeric("price_per_million_tokens", {
      precision: 12,
      scale: 6,
    }).notNull(),
    costPerMillionTokens: numeric("cost_per_million_tokens", {
      precision: 12,
      scale: 6,
    }).notNull(),
    transformConfig: jsonb("transform_config").$type<TransformConfig>(),
    defaultRpmLimit: integer("default_rpm_limit").notNull().default(60),
    defaultRpdLimit: integer("default_rpd_limit").notNull().default(1000),
    defaultDailyTokenLimit: integer("default_daily_token_limit"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    // One alias per feature (project), so /v1/{alias}/... resolves unambiguously.
    projectAliasIdx: uniqueIndex("api_products_project_alias_idx").on(
      t.projectId,
      t.pathAlias
    ),
  })
);

export type ApiProduct = typeof apiProducts.$inferSelect;
export type NewApiProduct = typeof apiProducts.$inferInsert;
