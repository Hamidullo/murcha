import { z } from "zod";

export const createDeliverySchema = z.object({
  courierMemberId: z.string().uuid(),
  orderIds: z.array(z.string().uuid()).min(1),
});

export const deliverStopSchema = z.object({
  cashCollected: z.number().nonnegative().optional(),
});

export const listDeliveriesQuerySchema = z.object({
  status: z.enum(["assigned", "done"]).optional(),
});
