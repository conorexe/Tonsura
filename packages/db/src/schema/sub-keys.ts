import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { apiProducts } from "./api-products";
import { projects } from "./projects";

// A key the operator hands to their own apps/services. Either a single-product
// key (projectId null) or a feature key (projectId set: authorizes every active
// product in the feature, alias-routed per request, feature stamped on usage).
export const subKeys = pgTable("sub_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Primary binding. Still used directly when projectId is null.
  productId: uuid("product_id")
    .references(() => apiProducts.id)
    .notNull(),
  // When set, this is a *feature key*.
  projectId: uuid("project_id").references(() => projects.id),
  keyHash: text("key_hash").notNull().unique(),
  label: text("label"),
  rpmLimit: integer("rpm_limit").notNull(),
  rpdLimit: integer("rpd_limit").notNull(),
  dailyTokenLimit: integer("daily_token_limit"),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubKey = typeof subKeys.$inferSelect;
export type NewSubKey = typeof subKeys.$inferInsert;
