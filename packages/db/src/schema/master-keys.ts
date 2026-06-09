import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { providers } from "./providers";

// The operator's real upstream credential, AES-256-GCM encrypted at rest.
// Never leaves the gateway: callers hold sub-keys, the gateway swaps in the
// decrypted master key on the way upstream.
export const masterKeys = pgTable("master_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id")
    .references(() => providers.id)
    .notNull(),
  label: text("label").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MasterKey = typeof masterKeys.$inferSelect;
export type NewMasterKey = typeof masterKeys.$inferInsert;
