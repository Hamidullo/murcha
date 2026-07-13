import { z } from "zod";

export const listCompaniesQuerySchema = z.object({
  search: z.string().optional(),
});

export const updateSubscriptionSchema = z.object({
  plan: z.enum(["free", "start", "business", "corporate"]).optional(),
  status: z.enum(["active", "expired", "trial"]).optional(),
  paidUntil: z.coerce.date().nullable().optional(),
  limits: z.record(z.string(), z.unknown()).optional(),
});
