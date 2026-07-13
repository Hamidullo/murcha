import { z } from "zod";

export const companySettingsSchema = z
  .object({
    creditLimitMode: z.enum(["block", "warn"]).optional(),
    exchangeRateMode: z.enum(["cbu", "manual"]).optional(),
    debtReminderDueSoonDays: z.number().int().min(0).optional(),
  })
  .passthrough();

export const showcaseSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    priceTypeId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
  })
  .passthrough();

export const updateCompanySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/, "Slug faqat kichik harf/raqam/tire")
    .optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Rang #RRGGBB formatida bo'lishi kerak")
    .optional(),
  settings: companySettingsSchema.optional(),
  showcaseSettings: showcaseSettingsSchema.optional(),
});
