/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class CategoriesRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string, nameUz: string, nameRu?: string, parentId?: string, sort?: number }} data
   * @returns {Promise<import("@prisma/client").Category>}
   */
  async create(tx, data) {
    return tx.category.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Category | null>}
   */
  async findById(tx, id) {
    return tx.category.findUnique({ where: { id } });
  }

  /**
   * Yassi ro'yxat (`parentId` bilan) — daraxt UI tomonda quriladi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @returns {Promise<import("@prisma/client").Category[]>}
   */
  async list(tx, companyId) {
    return tx.category.findMany({
      where: { companyId },
      orderBy: [{ sort: "asc" }, { nameUz: "asc" }],
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Category>}
   */
  async update(tx, id, data) {
    return tx.category.update({ where: { id }, data });
  }
}
