/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class CashShiftsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").CashShift>}
   */
  async create(tx, data) {
    return tx.cashShift.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").CashShift | null>}
   */
  async findById(tx, id) {
    return tx.cashShift.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} cashRegisterId
   * @returns {Promise<import("@prisma/client").CashShift | null>}
   */
  async findOpenByRegister(tx, cashRegisterId) {
    return tx.cashShift.findFirst({ where: { cashRegisterId, closedAt: null } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} cashRegisterId
   * @returns {Promise<import("@prisma/client").CashShift[]>}
   */
  async listByRegister(tx, cashRegisterId) {
    return tx.cashShift.findMany({
      where: { cashRegisterId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").CashShift>}
   */
  async update(tx, id, data) {
    return tx.cashShift.update({ where: { id }, data });
  }
}
