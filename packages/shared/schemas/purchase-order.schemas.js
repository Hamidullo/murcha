import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid("Yetkazib beruvchi tanlanishi shart"),
  warehouseId: z.string().uuid("Sklad tanlanishi shart"),
  expectedAt: z.coerce.date().optional(),
  currency: z.enum(["UZS", "USD"]).optional(),
  exchangeRate: z.number().positive().optional(),
});

export const createPurchaseOrderItemSchema = z.object({
  productId: z.string().uuid("Mahsulot tanlanishi shart"),
  unitId: z.string().uuid("Birlik tanlanishi shart"),
  qty: z.number().positive("Miqdor musbat bo'lishi kerak"),
  price: z.number().positive("Narx musbat bo'lishi kerak"),
});

/** PO asosida kirim: har qator qancha miqdor shu safar qabul qilinayotganini bildiradi. */
export const receivePurchaseOrderSchema = z.object({
  items: z
    .array(
      z.object({
        poItemId: z.string().uuid(),
        qty: z.number().positive(),
      }),
    )
    .min(1, "Kamida bitta qator bo'lishi kerak"),
});

export const listPurchaseOrdersQuerySchema = z.object({
  status: z.enum(["draft", "sent", "partially_received", "received", "cancelled"]).optional(),
  warehouseId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
});
