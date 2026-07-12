/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class PaymentsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Payment>}
   */
  async create(tx, data) {
    return tx.payment.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").PaymentAllocation>}
   */
  async addAllocation(tx, data) {
    return tx.paymentAllocation.create({ data });
  }
}
