import { z } from "zod";

/** E.164 format: +998901234567 */
export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Telefon +998... formatida bo'lishi kerak");

export const registerSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak"),
  fullName: z.string().min(2).max(200),
  companyName: z.string().min(2).max(200),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Parol kiritilishi shart"),
});

export const selectCompanySchema = z.object({
  pendingToken: z.string().min(1),
  companyId: z.string().uuid(),
});
