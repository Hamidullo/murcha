/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class CashRegistersRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string, name: string, type: string, currency: string }} data
   * @returns {Promise<import("@prisma/client").CashRegister>}
   */
  async create(tx, data) {
    return tx.cashRegister.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").CashRegister | null>}
   */
  async findById(tx, id) {
    return tx.cashRegister.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @returns {Promise<import("@prisma/client").CashRegister[]>}
   */
  async list(tx, companyId) {
    return tx.cashRegister.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").CashRegister>}
   */
  async update(tx, id, data) {
    return tx.cashRegister.update({ where: { id }, data });
  }
}
