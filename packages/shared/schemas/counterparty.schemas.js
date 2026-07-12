import { z } from "zod";

export const createCounterpartySchema = z.object({
  type: z.enum(["supplier", "customer", "both"]),
  name: z.string().min(2, "Nomi kamida 2 belgidan iborat bo'lishi kerak").max(300),
  phone: z.string().max(30).optional(),
  tin: z.string().max(20).optional(),
  creditLimit: z.number().nonnegative().optional(),
  paymentTermDays: z.number().int().nonnegative().optional(),
});

export const updateCounterpartySchema = createCounterpartySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listCounterpartiesQuerySchema = z.object({
  type: z.enum(["supplier", "customer", "both"]).optional(),
  search: z.string().min(1).max(200).optional(),
});
