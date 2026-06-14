import { z } from "zod";

export const TransformConfigSchema = z.object({
  request: z
    .object({
      systemPrompt: z.string().optional(),
      promptPrefix: z.string().optional(),
      promptSuffix: z.string().optional(),
      addHeaders: z.record(z.string()).optional(),
      removeHeaders: z.array(z.string()).optional(),
      addFields: z.record(z.unknown()).optional(),
      removeFields: z.array(z.string()).optional(),
      fieldMap: z.record(z.string()).optional(),
    })
    .optional(),
  response: z
    .object({
      addFields: z.record(z.unknown()).optional(),
      removeFields: z.array(z.string()).optional(),
      fieldMap: z.record(z.string()).optional(),
    })
    .optional(),
});

export type TransformConfig = z.infer<typeof TransformConfigSchema>;

export const CreateProductSchema = z.object({
  masterKeyId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  pathAlias: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  unitType: z.enum(["token", "request", "record"]).default("token"),
  pricePerMillionTokens: z.string().regex(/^\d+(\.\d{1,6})?$/),
  costPerMillionTokens: z.string().regex(/^\d+(\.\d{1,6})?$/),
  transformConfig: TransformConfigSchema.optional(),
  defaultRpmLimit: z.number().int().positive().default(60),
  defaultRpdLimit: z.number().int().positive().default(1000),
  defaultDailyTokenLimit: z.number().int().positive().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
