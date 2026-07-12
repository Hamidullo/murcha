/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). `product_prices` immutable
 * jurnal — UPDATE/DELETE yo'q, faqat `create` va o'qish. `company_id` ustuni
 * yo'q (bola-jadval, ota `products` orqali izolyatsiya qilinadi — rls.sql).
 */
export class ProductPricesRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").ProductPrice>}
   */
  async create(tx, data) {
    return tx.productPrice.create({ data });
  }

  /**
   * To'liq narx tarixi, narx turi va sana bo'yicha (eng yangisi birinchi).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductPrice[]>}
   */
  async listByProduct(tx, productId) {
    return tx.productPrice.findMany({
      where: { productId },
      orderBy: [{ priceTypeId: "asc" }, { validFrom: "desc" }],
    });
  }

  /**
   * Har narx turi uchun `asOf` sanaga nisbatan eng oxirgi (joriy) narx
   * (`distinct` + `orderBy` — Postgres `DISTINCT ON` ekvivalenti).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} productId
   * @param {Date} asOf
   * @returns {Promise<import("@prisma/client").ProductPrice[]>}
   */
  async listCurrentByProduct(tx, productId, asOf) {
    return tx.productPrice.findMany({
      where: { productId, validFrom: { lte: asOf } },
      orderBy: [{ priceTypeId: "asc" }, { validFrom: "desc" }],
      distinct: ["priceTypeId"],
    });
  }
}
