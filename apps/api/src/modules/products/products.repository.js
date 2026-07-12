/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class ProductsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Product>}
   */
  async create(tx, data) {
    return tx.product.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Product | null>}
   */
  async findById(tx, id) {
    return tx.product.findUnique({ where: { id } });
  }

  /**
   * SKU noyobligini ilova darajasida tekshirish uchun (RLS tufayli joriy
   * kompaniya doirasida qidiradi — `@@unique([companyId, sku])`).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} sku
   * @returns {Promise<import("@prisma/client").Product | null>}
   */
  async findBySku(tx, sku) {
    return tx.product.findFirst({ where: { sku } });
  }

  /**
   * O'chirilmagan mahsulotlar ro'yxati (`deletedAt: null`).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @returns {Promise<import("@prisma/client").Product[]>}
   */
  async list(tx, companyId) {
    return tx.product.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { nameUz: "asc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Product>}
   */
  async update(tx, id, data) {
    return tx.product.update({ where: { id }, data });
  }
}
