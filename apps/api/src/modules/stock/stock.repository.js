/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). `applyDelta` — Prisma
 * `upsert` + `{ increment }` orqali atomik (Postgres'da bitta
 * `INSERT ... ON CONFLICT DO UPDATE`, race yo'q — `prisma/stock.sql`dagi
 * `NULLS NOT DISTINCT` shu constraint'ning variant/partiyasiz mahsulotlarda
 * ham to'g'ri ishlashi uchun shart).
 */
export class StockRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ warehouseId: string, productId: string, variantId: string | null, batchId: string | null }} key
   * @returns {Promise<import("@prisma/client").Stock | null>}
   */
  async findOne(tx, key) {
    return tx.stock.findUnique({
      where: {
        warehouseId_productId_variantId_batchId: {
          warehouseId: key.warehouseId,
          productId: key.productId,
          variantId: key.variantId ?? null,
          batchId: key.batchId ?? null,
        },
      },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string, warehouseId: string, productId: string, variantId: string | null, batchId: string | null, qtyDelta: number }} data
   * @returns {Promise<import("@prisma/client").Stock>}
   */
  async applyDelta(tx, data) {
    return tx.stock.upsert({
      where: {
        warehouseId_productId_variantId_batchId: {
          warehouseId: data.warehouseId,
          productId: data.productId,
          variantId: data.variantId ?? null,
          batchId: data.batchId ?? null,
        },
      },
      update: { quantity: { increment: data.qtyDelta } },
      create: {
        id: data.id,
        companyId: data.companyId,
        warehouseId: data.warehouseId,
        productId: data.productId,
        variantId: data.variantId ?? null,
        batchId: data.batchId ?? null,
        quantity: data.qtyDelta,
      },
    });
  }

  /**
   * `onlyTracked` — `minQty` belgilangan qatorlar (low-stock hisoblash uchun,
   * `quantity <= minQty` taqqoslash Prisma'da ifodalanmaydi — service
   * qatlamida JS'da filtrlanadi).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ warehouseId?: string, productId?: string, onlyTracked?: boolean }} [filters]
   * @returns {Promise<import("@prisma/client").Stock[]>}
   */
  async list(tx, companyId, filters = {}) {
    return tx.stock.findMany({
      where: {
        companyId,
        ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters.productId ? { productId: filters.productId } : {}),
        ...(filters.onlyTracked ? { minQty: { not: null } } : {}),
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        product: { select: { id: true, nameUz: true, sku: true } },
        variant: { select: { id: true, name: true } },
      },
      orderBy: [{ warehouseId: "asc" }, { productId: "asc" }],
    });
  }
}
