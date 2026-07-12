/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class ExpenseCategoriesRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string, name: string }} data
   * @returns {Promise<import("@prisma/client").ExpenseCategory>}
   */
  async create(tx, data) {
    return tx.expenseCategory.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").ExpenseCategory | null>}
   */
  async findById(tx, id) {
    return tx.expenseCategory.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @returns {Promise<import("@prisma/client").ExpenseCategory[]>}
   */
  async list(tx, companyId) {
    return tx.expenseCategory.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").ExpenseCategory>}
   */
  async update(tx, id, data) {
    return tx.expenseCategory.update({ where: { id }, data });
  }
}
