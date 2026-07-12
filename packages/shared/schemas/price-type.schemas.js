import { z } from "zod";

export const createPriceTypeSchema = z.object({
  name: z.string().min(2).max(200),
  isDefault: z.boolean().optional(),
});

export const updatePriceTypeSchema = createPriceTypeSchema.partial();
