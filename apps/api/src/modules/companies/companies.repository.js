/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class CompaniesRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, name: string }} data
   * @returns {Promise<import("@prisma/client").Company>}
   */
  async create(tx, data) {
    return tx.company.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Company | null>}
   */
  async findById(tx, id) {
    return tx.company.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Company>}
   */
  async update(tx, id, data) {
    return tx.company.update({ where: { id }, data });
  }
}
