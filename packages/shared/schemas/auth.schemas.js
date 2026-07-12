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

export const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak"),
});

export const forgotPasswordSchema = z.object({
  phone: phoneSchema,
});

export const resetPasswordSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Kod 6 xonali bo'lishi kerak"),
  password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak"),
});
