import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
