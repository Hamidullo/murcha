/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). `product_units` jadvalida
 * `company_id` ustuni yo'q — RLS'ga ega emas (rls.sql: bola-jadval, ota
 * `products` orqali izolyatsiya qilinadi). Shu sababli servis qatlami har
 * doim avval `ProductsRepository.findById` orqali mahsulot egaligini
 * tekshiradi, so'ng shu repository chaqiriladi.
 */
export class ProductUnitsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, productId: string, unitId: string, factor: number }} data
   * @returns {Promise<import("@prisma/client").ProductUnit>}
   */
  async create(tx, data) {
    return tx.productUnit.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").ProductUnit | null>}
   */
  async findById(tx, id) {
    return tx.productUnit.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} productId
   * @param {string} unitId
   * @returns {Promise<import("@prisma/client").ProductUnit | null>}
   */
  async findByProductAndUnit(tx, productId, unitId) {
    return tx.productUnit.findUnique({ where: { productId_unitId: { productId, unitId } } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductUnit[]>}
   */
  async list(tx, productId) {
    return tx.productUnit.findMany({ where: { productId }, include: { unit: true } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(tx, id) {
    await tx.productUnit.delete({ where: { id } });
  }
}
