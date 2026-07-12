import { z } from "zod";

export const createInventoryCountSchema = z.object({
  warehouseId: z.string().uuid("Sklad tanlanishi shart"),
});

export const updateInventoryCountItemSchema = z.object({
  countedQty: z.number().nonnegative("Miqdor manfiy bo'lishi mumkin emas"),
});

export const listInventoryCountsQuerySchema = z.object({
  warehouseId: z.string().uuid().optional(),
  status: z.enum(["in_progress", "review", "approved"]).optional(),
});
