import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().min(1, "SKU kiritilishi shart").max(100),
  nameUz: z.string().min(2, "Nom kamida 2 belgidan iborat bo'lishi kerak").max(300),
  nameRu: z.string().max(300).optional(),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid("Noto'g'ri kategoriya").optional(),
  brand: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  baseUnitId: z.string().uuid("Asosiy birlik tanlanishi shart"),
  vatRate: z.number().min(0).max(100).optional(),
  ikpuCode: z.string().max(50).optional(),
  minOrderQty: z.number().positive().optional(),
  orderMultiple: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  volumeM3: z.number().positive().optional(),
  trackBatches: z.boolean().optional(),
  custom: z.record(z.string(), z.unknown()).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(["active", "archived"]).optional(),
});

/** `GET /api/v1/products` — nom bo'yicha qidiruv (trigram GIN indeks) + kategoriya filtri. */
export const listProductsQuerySchema = z.object({
  search: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
});

/** O'ram-birlik konvertatsiyasi (masalan "1 blok = 20 dona"). */
export const createProductUnitSchema = z.object({
  unitId: z.string().uuid(),
  factor: z.number().positive(),
});

export const createProductBarcodeSchema = z.object({
  barcode: z.string().min(4).max(50),
  unitId: z.string().uuid().optional(),
});

/**
 * Narx tarixi — immutable (UPDATE yo'q). `validFrom` berilmasa hozirgi vaqt
 * ishlatiladi (service qatlamida).
 */
export const createProductPriceSchema = z.object({
  priceTypeId: z.string().uuid(),
  price: z.number().positive(),
  currency: z.enum(["UZS", "USD"]),
  validFrom: z.coerce.date().optional(),
});

export const createProductVariantSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(300),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const updateProductVariantSchema = createProductVariantSchema.partial();
