import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().min(1).max(100),
  nameUz: z.string().min(2).max(300),
  nameRu: z.string().max(300).optional(),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
  brand: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  baseUnitId: z.string().uuid(),
  vatRate: z.number().min(0).max(100).optional(),
  ikpuCode: z.string().max(50).optional(),
  minOrderQty: z.number().positive().optional(),
  orderMultiple: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  volumeM3: z.number().positive().optional(),
  trackBatches: z.boolean().optional(),
  custom: z.record(z.string(), z.unknown()).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(["active", "archived"]).optional(),
});
