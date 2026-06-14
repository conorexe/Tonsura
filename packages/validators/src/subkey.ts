import { z } from "zod";
import { TransformConfigSchema } from "./product";

export const CreateSubKeySchema = z
  .object({
    productId: z.string().uuid().optional(),
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

export const BindingMetaSchema = z.object({
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

export const SubKeyMetaSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  productId: z.string().uuid(),
  providerId: z.string().uuid(),
  providerType: z.enum(["llm", "generic", "openai", "anthropic", "elevenlabs"]),
  providerBaseUrl: z.string().url(),
  authScheme: z.enum(["bearer", "header", "query"]).default("bearer"),
  authParam: z.string().nullable().default(null),
  encryptedMasterKey: z.string(),
  rpmLimit: z.number().int(),
  rpdLimit: z.number().int(),
  dailyTokenLimit: z.number().int().nullable(),
  unitType: z.enum(["token", "character", "request", "record"]),
  pricePerMillionTokens: z.string(),
  costPerMillionTokens: z.string(),
  transformConfig: TransformConfigSchema.nullable(),
  feature: z.string().default(""),
  bindings: z.array(BindingMetaSchema).default([]),
});

export type SubKeyMeta = z.infer<typeof SubKeyMetaSchema>;
