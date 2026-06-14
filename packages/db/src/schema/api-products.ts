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
    // NULL = not alias-routable.
    pathAlias: text("path_alias"),
    unitType: text("unit_type").notNull().default("token"),
    // Per million units of unitType (token | character | request | record).
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
    projectAliasIdx: uniqueIndex("api_products_project_alias_idx").on(
      t.projectId,
      t.pathAlias
    ),
  })
);

export type ApiProduct = typeof apiProducts.$inferSelect;
export type NewApiProduct = typeof apiProducts.$inferInsert;
