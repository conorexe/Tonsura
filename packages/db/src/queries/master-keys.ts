import { eq } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { masterKeys } from "../schema/index";

export async function createMasterKey(
  db: DrizzleClient,
  data: typeof masterKeys.$inferInsert
) {
  const [row] = await db.insert(masterKeys).values(data).returning();
  return row;
}

// Excludes encryptedKey.
export async function listMasterKeys(db: DrizzleClient) {
  return db
    .select({
      id: masterKeys.id,
      providerId: masterKeys.providerId,
      label: masterKeys.label,
      active: masterKeys.active,
      createdAt: masterKeys.createdAt,
    })
    .from(masterKeys)
    .orderBy(masterKeys.createdAt);
}

export async function revokeMasterKey(db: DrizzleClient, id: string) {
  await db
    .update(masterKeys)
    .set({ active: false })
    .where(eq(masterKeys.id, id));
}
