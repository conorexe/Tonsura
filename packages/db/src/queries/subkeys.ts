import { and, eq } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import {
  apiProducts,
  masterKeys,
  projects,
  providers,
  subKeys,
} from "../schema/index";
import type { BindingMeta, SubKeyMeta } from "@tonsura/validators";

// Load every active root-API binding in a feature (project): each active product
// joined to its master key + provider becomes a selectable BindingMeta keyed by
// its path alias. Used to populate a feature key's meta.bindings.
async function loadFeatureBindings(
  db: DrizzleClient,
  projectId: string
): Promise<BindingMeta[]> {
  const rows = await db
    .select({
      pathAlias: apiProducts.pathAlias,
      productId: apiProducts.id,
      unitType: apiProducts.unitType,
      transformConfig: apiProducts.transformConfig,
      pricePerMillionTokens: apiProducts.pricePerMillionTokens,
      costPerMillionTokens: apiProducts.costPerMillionTokens,
      encryptedMasterKey: masterKeys.encryptedKey,
      providerId: providers.id,
      providerType: providers.type,
      providerBaseUrl: providers.baseUrl,
      authScheme: providers.authScheme,
      authParam: providers.authParam,
    })
    .from(apiProducts)
    .innerJoin(masterKeys, eq(apiProducts.masterKeyId, masterKeys.id))
    .innerJoin(providers, eq(masterKeys.providerId, providers.id))
    .where(
      and(
        eq(apiProducts.projectId, projectId),
        eq(apiProducts.active, true),
        eq(masterKeys.active, true)
      )
    );

  return rows.map((r) => ({
    pathAlias: r.pathAlias ?? null,
    productId: r.productId,
    providerId: r.providerId,
    providerType: r.providerType as BindingMeta["providerType"],
    providerBaseUrl: r.providerBaseUrl,
    authScheme: (r.authScheme ?? "bearer") as BindingMeta["authScheme"],
    authParam: r.authParam ?? null,
    encryptedMasterKey: r.encryptedMasterKey,
    unitType: r.unitType as BindingMeta["unitType"],
    pricePerMillionTokens: r.pricePerMillionTokens,
    costPerMillionTokens: r.costPerMillionTokens,
    transformConfig: r.transformConfig ?? null,
  }));
}

export async function getSubKeyByHash(
  db: DrizzleClient,
  keyHash: string
): Promise<SubKeyMeta | null> {
  const rows = await db
    .select({
      id: subKeys.id,
      // The feature a key is bound to (null = single-product key).
      featureProjectId: subKeys.projectId,
      featureSlug: projects.slug,
      productId: subKeys.productId,
      rpmLimit: subKeys.rpmLimit,
      rpdLimit: subKeys.rpdLimit,
      dailyTokenLimit: subKeys.dailyTokenLimit,
      unitType: apiProducts.unitType,
      productProjectId: apiProducts.projectId,
      transformConfig: apiProducts.transformConfig,
      pricePerMillionTokens: apiProducts.pricePerMillionTokens,
      costPerMillionTokens: apiProducts.costPerMillionTokens,
      encryptedMasterKey: masterKeys.encryptedKey,
      providerId: providers.id,
      providerType: providers.type,
      providerBaseUrl: providers.baseUrl,
      authScheme: providers.authScheme,
      authParam: providers.authParam,
    })
    .from(subKeys)
    .innerJoin(apiProducts, eq(subKeys.productId, apiProducts.id))
    .innerJoin(masterKeys, eq(apiProducts.masterKeyId, masterKeys.id))
    .innerJoin(providers, eq(masterKeys.providerId, providers.id))
    .leftJoin(projects, eq(subKeys.projectId, projects.id))
    .where(
      and(
        eq(subKeys.keyHash, keyHash),
        eq(subKeys.active, true),
        eq(apiProducts.active, true),
        eq(masterKeys.active, true)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Feature key: authorize the whole feature (project) and route per-request by
  // path alias. Stamp the feature slug on usage so no header is needed. The
  // top-level fields stay populated (primary binding) for back-compat.
  const isFeatureKey = !!row.featureProjectId;
  const bindings = isFeatureKey
    ? await loadFeatureBindings(db, row.featureProjectId!)
    : [];

  return {
    id: row.id,
    // For a feature key the attribution project is the feature itself; otherwise
    // it's the product's project (if any).
    projectId: row.featureProjectId ?? row.productProjectId ?? null,
    productId: row.productId,
    providerId: row.providerId,
    providerType: row.providerType as SubKeyMeta["providerType"],
    providerBaseUrl: row.providerBaseUrl,
    authScheme: (row.authScheme ?? "bearer") as "bearer" | "header" | "query",
    authParam: row.authParam ?? null,
    encryptedMasterKey: row.encryptedMasterKey,
    rpmLimit: row.rpmLimit,
    rpdLimit: row.rpdLimit,
    dailyTokenLimit: row.dailyTokenLimit,
    unitType: row.unitType as SubKeyMeta["unitType"],
    pricePerMillionTokens: row.pricePerMillionTokens,
    costPerMillionTokens: row.costPerMillionTokens,
    transformConfig: row.transformConfig ?? null,
    feature: row.featureSlug ?? "",
    bindings,
  };
}

export async function createSubKey(
  db: DrizzleClient,
  data: {
    productId: string;
    // Set ⇒ feature key (authorizes the whole project/feature, alias-routed).
    projectId?: string;
    keyHash: string;
    label?: string;
    rpmLimit: number;
    rpdLimit: number;
    dailyTokenLimit?: number;
    expiresAt?: Date;
  }
) {
  const [row] = await db.insert(subKeys).values(data).returning();
  return row;
}

export async function revokeSubKey(db: DrizzleClient, id: string) {
  await db.update(subKeys).set({ active: false }).where(eq(subKeys.id, id));
}

export async function listSubKeys(db: DrizzleClient) {
  return db.select().from(subKeys).orderBy(subKeys.createdAt);
}
