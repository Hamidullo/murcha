/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class PriceTypesRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string, name: string, isDefault?: boolean }} data
   * @returns {Promise<import("@prisma/client").PriceType>}
   */
  async create(tx, data) {
    return tx.priceType.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").PriceType | null>}
   */
  async findById(tx, id) {
    return tx.priceType.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @returns {Promise<import("@prisma/client").PriceType[]>}
   */
  async list(tx, companyId) {
    return tx.priceType.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").PriceType>}
   */
  async update(tx, id, data) {
    return tx.priceType.update({ where: { id }, data });
  }

  /**
   * Bitta kompaniyada faqat bitta narx turi `isDefault:true` bo'lishi kerak —
   * yangisi belgilanganda avvalgisi o'chiriladi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {string | null} excludeId
   * @returns {Promise<void>}
   */
  async unsetDefault(tx, companyId, excludeId) {
    await tx.priceType.updateMany({
      where: { companyId, isDefault: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
      data: { isDefault: false },
    });
  }
}
