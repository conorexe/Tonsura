import { z } from "zod";
import { TransformConfigSchema } from "./product";

export const CreateSubKeySchema = z
  .object({
    // Single-product key: bind directly to one product.
    productId: z.string().uuid().optional(),
    // Feature key: authorize a whole feature (project). The gateway then selects
    // the upstream per-request by path alias and stamps the feature intrinsically.
    // The server resolves a primary productId from the project for back-compat.
    projectId: z.string().uuid().optional(),
    label: z.string().max(200).optional(),
    rpmLimit: z.number().int().positive(),
    rpdLimit: z.number().int().positive(),
    dailyTokenLimit: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
  })
  .refine((d) => !!d.productId || !!d.projectId, {
    message: "Provide productId (single product) or projectId (feature key)",
    path: ["projectId"],
  });

export type CreateSubKeyInput = z.infer<typeof CreateSubKeySchema>;

// One root-API binding within a feature. A feature key carries several of these
// and the gateway picks one per request by its pathAlias (the first path segment
// after /v1). Each binding has its own upstream, auth, unit type and pricing, so
// a single feature can span e.g. OpenAI (tokens) and ElevenLabs (characters).
export const BindingMetaSchema = z.object({
  // The URL segment that selects this binding, e.g. "chat" or "tts". Null for a
  // legacy single-binding key (no alias routing).
  pathAlias: z.string().nullable().default(null),
  productId: z.string().uuid(),
  providerId: z.string().uuid(),
  providerType: z.enum(["llm", "generic", "openai", "anthropic", "elevenlabs"]),
  providerBaseUrl: z.string().url(),
  authScheme: z.enum(["bearer", "header", "query"]).default("bearer"),
  authParam: z.string().nullable().default(null),
  encryptedMasterKey: z.string(),
  unitType: z.enum(["token", "character", "request", "record"]),
  pricePerMillionTokens: z.string(),
  costPerMillionTokens: z.string(),
  transformConfig: TransformConfigSchema.nullable(),
});

export type BindingMeta = z.infer<typeof BindingMetaSchema>;

// Everything the gateway needs to authorize, route, price, and attribute one
// request — resolved once per key (cached in-process) so the hot path makes a
// single DB round trip at most.
export const SubKeyMetaSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  productId: z.string().uuid(),
  providerId: z.string().uuid(),
  // providerType selects the usage extractor in the gateway. "llm"/"generic"
  // are the legacy keys (auto-detect token shape / non-metered); the named
  // providers route to a dedicated extractor (e.g. ElevenLabs char-counting).
  providerType: z.enum(["llm", "generic", "openai", "anthropic", "elevenlabs"]),
  providerBaseUrl: z.string().url(),
  // How to present the upstream key. bearer | header | query.
  authScheme: z.enum(["bearer", "header", "query"]).default("bearer"),
  authParam: z.string().nullable().default(null),
  encryptedMasterKey: z.string(),
  rpmLimit: z.number().int(),
  rpdLimit: z.number().int(),
  dailyTokenLimit: z.number().int().nullable(),
  unitType: z.enum(["token", "character", "request", "record"]),
  // Per million units of unitType (see api_products schema).
  pricePerMillionTokens: z.string(),
  costPerMillionTokens: z.string(),
  transformConfig: TransformConfigSchema.nullable(),
  // Feature attribution intrinsic to the key (the project/feature slug). Stamped
  // on usage automatically so callers needn't send X-Tonsura-Feature. Empty for
  // single-product keys (which still honor the header).
  feature: z.string().default(""),
  // Extra root-API bindings selectable per-request by path alias. Empty for a
  // single-product key, where the top-level fields above are the sole binding.
  // When non-empty, the gateway routes /v1/{alias}/... to the matching binding.
  bindings: z.array(BindingMetaSchema).default([]),
});

export type SubKeyMeta = z.infer<typeof SubKeyMetaSchema>;
