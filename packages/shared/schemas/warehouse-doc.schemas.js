import { z } from "zod";

export const warehouseDocTypeSchema = z.enum(["receipt", "issue", "writeoff", "transfer"]);

/** Qoralama hujjat yaratish. `transfer` — `toWarehouseId` shart, boshqalarida taqiqlangan. */
export const createWarehouseDocSchema = z
  .object({
    type: warehouseDocTypeSchema,
    warehouseId: z.string().uuid("Sklad tanlanishi shart"),
    toWarehouseId: z.string().uuid().optional(),
    counterpartyId: z.string().uuid().optional(),
    purchaseOrderId: z.string().uuid().optional(),
    currency: z.enum(["UZS", "USD"]).optional(),
    exchangeRate: z.number().positive().optional(),
    reason: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "transfer") {
      if (!data.toWarehouseId) {
        ctx.addIssue({
          code: "custom",
          path: ["toWarehouseId"],
          message: "Ko'chirish uchun qabul qiluvchi sklad kerak",
        });
      } else if (data.toWarehouseId === data.warehouseId) {
        ctx.addIssue({
          code: "custom",
          path: ["toWarehouseId"],
          message: "Qabul qiluvchi sklad chiqish skladidan farq qilishi kerak",
        });
      }
    } else if (data.toWarehouseId) {
      ctx.addIssue({
        code: "custom",
        path: ["toWarehouseId"],
        message: "toWarehouseId faqat ko'chirish hujjatida ishlatiladi",
      });
    }
  });

export const updateWarehouseDocSchema = z.object({
  counterpartyId: z.string().uuid().optional(),
  currency: z.enum(["UZS", "USD"]).optional(),
  exchangeRate: z.number().positive().optional(),
  reason: z.string().max(500).optional(),
});

export const createWarehouseDocItemSchema = z.object({
  productId: z.string().uuid("Mahsulot tanlanishi shart"),
  variantId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  unitId: z.string().uuid("Birlik tanlanishi shart"),
  qty: z.number().positive("Miqdor musbat bo'lishi kerak"),
  price: z.number().nonnegative().optional(),
});

export const listWarehouseDocsQuerySchema = z.object({
  type: warehouseDocTypeSchema.optional(),
  status: z.enum(["draft", "confirmed", "cancelled"]).optional(),
  warehouseId: z.string().uuid().optional(),
});
