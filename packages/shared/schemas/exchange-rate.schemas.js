import { z } from "zod";

export const createExchangeRateSchema = z.object({
  currency: z.enum(["USD"]).default("USD"),
  rate: z.number().positive(),
  rateDate: z.coerce.date().optional(),
});

export const currentRateQuerySchema = z.object({
  currency: z.enum(["USD"]).default("USD"),
});
