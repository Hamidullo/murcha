import { z } from "zod";

export const statementQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const agingQuerySchema = z.object({
  asOf: z.string().date().optional(),
});

export const createDebtAdjustmentSchema = z.object({
  counterpartyId: z.string().uuid(),
  type: z.enum(["adjustment", "opening"]).default("adjustment"),
  amount: z.number(),
  currency: z.string().default("UZS"),
  dueDate: z.string().date().optional(),
  comment: z.string().max(500).optional(),
});
