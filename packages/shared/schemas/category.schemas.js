import { z } from "zod";

export const createCategorySchema = z.object({
  nameUz: z.string().min(2).max(200),
  nameRu: z.string().max(200).optional(),
  parentId: z.string().uuid().optional(),
  sort: z.number().int().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
