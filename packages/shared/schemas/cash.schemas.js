import { z } from "zod";

export const createCashRegisterSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(["cash", "bank", "card"]),
  currency: z.enum(["UZS", "USD"]).default("UZS"),
});

export const updateCashRegisterSchema = createCashRegisterSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createExpenseCategorySchema = z.object({
  name: z.string().min(2).max(200),
});

export const updateExpenseCategorySchema = createExpenseCategorySchema.partial();

export const createTransactionSchema = z.object({
  cashRegisterId: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().uuid().optional(),
  counterpartyId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.enum(["UZS", "USD"]),
  exchangeRate: z.number().positive().optional(),
  comment: z.string().max(500).optional(),
  occurredAt: z.coerce.date().optional(),
});

export const createTransferSchema = z.object({
  fromCashRegisterId: z.string().uuid(),
  toCashRegisterId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(["UZS", "USD"]),
  comment: z.string().max(500).optional(),
  occurredAt: z.coerce.date().optional(),
});

export const listTransactionsQuerySchema = z.object({
  cashRegisterId: z.string().uuid().optional(),
  type: z.enum(["income", "expense", "transfer_out", "transfer_in"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const openCashShiftSchema = z.object({
  openingBalance: z.number().min(0).default(0),
});

export const closeCashShiftSchema = z.object({
  countedBalance: z.number().min(0),
  comment: z.string().max(500).optional(),
});
