/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). `product_variants` — RLS'ga
 * ega emas (bola-jadval, `company_id` ustuni yo'q, ota `products` orqali
 * izolyatsiya qilinadi — rls.sql). Servis qatlami har doim avval
 * `ProductsRepository.findById` orqali mahsulot egaligini tekshiradi.
 */
export class ProductVariantsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").ProductVariant>}
   */
  async create(tx, data) {
    return tx.productVariant.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").ProductVariant | null>}
   */
  async findById(tx, id) {
    return tx.productVariant.findUnique({ where: { id } });
  }

  /**
   * O'chirilmagan variantlar ro'yxati (`deletedAt: null`).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductVariant[]>}
   */
  async list(tx, productId) {
    return tx.productVariant.findMany({
      where: { productId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").ProductVariant>}
   */
  async update(tx, id, data) {
    return tx.productVariant.update({ where: { id }, data });
  }
}
