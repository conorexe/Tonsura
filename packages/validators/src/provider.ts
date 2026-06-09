import { z } from "zod";

// Provider type selects the gateway's usage extractor: named providers get a
// dedicated extractor (token usage / character counting), "llm" auto-detects
// common token shapes, "generic" is unmetered (per-request billing).
export const ProviderTypeEnum = z.enum([
  "llm",
  "generic",
  "openai",
  "anthropic",
  "elevenlabs",
]);

export const ProviderSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  baseUrl: z.string().url(),
  type: ProviderTypeEnum.default("generic"),
  // How the upstream key is presented: bearer | header | query (+ param name).
  authScheme: z.enum(["bearer", "header", "query"]).default("bearer"),
  authParam: z.string().max(120).optional(),
});

export type CreateProviderInput = z.infer<typeof ProviderSchema>;

export const UnitTypeEnum = z.enum(["token", "character", "request", "record"]);
export type UnitType = z.infer<typeof UnitTypeEnum>;
