import { z } from "zod";

export const listStockQuerySchema = z.object({
  warehouseId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export const lowStockQuerySchema = z.object({
  warehouseId: z.string().uuid().optional(),
});

export const averageCostQuerySchema = z.object({
  productId: z.string().uuid("Mahsulot tanlanishi shart"),
  warehouseId: z.string().uuid().optional(),
});
