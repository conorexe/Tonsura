import { eq } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { providers } from "../schema/index";

export async function listActiveProviders(db: DrizzleClient) {
  return db
    .select()
    .from(providers)
    .where(eq(providers.active, true))
    .orderBy(providers.name);
}

// Connect an arbitrary upstream API: any base URL, any auth presentation.
// Slug is derived from the name and de-collided with a timestamp suffix.
export async function createCustomProvider(
  db: DrizzleClient,
  data: {
    name: string;
    baseUrl: string;
    type?: string;
    authScheme?: string;
    authParam?: string | null;
  }
) {
  const base =
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "api";
  const slug = `${base}-${Date.now().toString(36)}`;

  const [row] = await db
    .insert(providers)
    .values({
      name: data.name,
      slug,
      baseUrl: data.baseUrl,
      type: data.type ?? "generic",
      authScheme: data.authScheme ?? "bearer",
      authParam: data.authParam ?? null,
    })
    .returning();
  return row;
}

export async function getProviderBySlug(db: DrizzleClient, slug: string) {
  const [row] = await db
    .select()
    .from(providers)
    .where(eq(providers.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function createProvider(
  db: DrizzleClient,
  data: typeof providers.$inferInsert
) {
  const [row] = await db.insert(providers).values(data).returning();
  return row;
}
