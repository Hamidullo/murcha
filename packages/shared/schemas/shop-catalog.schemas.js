import { z } from "zod";

export const listShopCatalogQuerySchema = z.object({
  search: z.string().min(1).max(200).optional(),
  warehouseId: z.string().uuid().optional(),
});
