import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// A feature: a named group of root-API products that one feature key can
// authorize, and the primary attribution dimension on usage.
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
