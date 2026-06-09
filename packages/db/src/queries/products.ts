import { and, asc, eq } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { apiProducts } from "../schema/index";

export async function getProductById(db: DrizzleClient, id: string) {
  const [row] = await db
    .select()
    .from(apiProducts)
    .where(eq(apiProducts.id, id))
    .limit(1);
  return row ?? null;
}

export async function listProducts(db: DrizzleClient) {
  return db.select().from(apiProducts).orderBy(apiProducts.createdAt);
}

// Active products in a feature (project), oldest first. Used to populate a
// feature key's bindings preview and to pick a primary product for the sub-key
// row (the top-level binding).
export async function listActiveProductsByProject(
  db: DrizzleClient,
  projectId: string
) {
  return db
    .select()
    .from(apiProducts)
    .where(
      and(eq(apiProducts.projectId, projectId), eq(apiProducts.active, true))
    )
    .orderBy(asc(apiProducts.createdAt));
}

export async function createProduct(
  db: DrizzleClient,
  data: typeof apiProducts.$inferInsert
) {
  const [row] = await db.insert(apiProducts).values(data).returning();
  return row;
}

export async function updateProduct(
  db: DrizzleClient,
  id: string,
  data: Partial<typeof apiProducts.$inferInsert>
) {
  const [row] = await db
    .update(apiProducts)
    .set(data)
    .where(eq(apiProducts.id, id))
    .returning();
  return row ?? null;
}
