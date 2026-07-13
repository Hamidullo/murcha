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
   * Vitrina (`showcase` moduli) va slug uniqueness tekshiruvi uchun.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} slug
   * @returns {Promise<import("@prisma/client").Company | null>}
   */
  async findBySlug(tx, slug) {
    return tx.company.findUnique({ where: { slug } });
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
