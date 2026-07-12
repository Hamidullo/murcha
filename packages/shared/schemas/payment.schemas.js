import { z } from "zod";

export const paymentAllocationSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
});

export const createPaymentSchema = z.object({
  counterpartyId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default("UZS"),
  method: z.enum(["cash", "bank", "card"]),
  cashRegisterId: z.string().uuid().optional(),
  deliveryId: z.string().uuid().optional(),
  occurredAt: z.string().datetime().optional(),
  allocations: z.array(paymentAllocationSchema).optional(),
});
