import { z } from "zod";

export const createOrderItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  unitId: z.string().uuid(),
  qty: z.number().positive(),
});

export const createOrderSchema = z.object({
  warehouseId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  items: z.array(createOrderItemSchema).min(1),
  comment: z.string().max(1000).optional(),
});

export const shipOrderItemSchema = z.object({
  orderItemId: z.string().uuid(),
  qty: z.number().positive(),
});

export const shipOrderSchema = z.object({
  items: z.array(shipOrderItemSchema).optional(),
});

export const listOrdersQuerySchema = z.object({
  status: z
    .enum(["new", "confirmed", "picking", "shipped", "delivered", "accepted", "cancelled"])
    .optional(),
  salePointId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
});
