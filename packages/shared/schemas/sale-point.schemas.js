import { z } from "zod";

export const createSalePointSchema = z.object({
  name: z.string().min(2).max(200),
  priceTypeId: z.string().uuid(),
  address: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  phone: z.string().max(30).optional(),
  creditLimit: z.number().nonnegative().optional(),
  paymentTermDays: z.number().int().nonnegative().optional(),
});

export const updateSalePointSchema = createSalePointSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const assignOperatorSchema = z.object({
  phone: z.string().min(9).max(30),
});
