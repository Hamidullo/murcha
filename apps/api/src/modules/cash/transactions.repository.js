/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). Transaction — immutable (faqat create). */
export class TransactionsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Transaction>}
   */
  async create(tx, data) {
    return tx.transaction.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ cashRegisterId?: string, type?: string, from?: Date, to?: Date }} [filters]
   * @returns {Promise<import("@prisma/client").Transaction[]>}
   */
  async list(tx, companyId, filters = {}) {
    const { cashRegisterId, type, from, to } = filters;
    return tx.transaction.findMany({
      where: {
        companyId,
        ...(cashRegisterId ? { cashRegisterId } : {}),
        ...(type ? { type } : {}),
        ...(from || to
          ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      include: {
        cashRegister: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { occurredAt: "desc" },
    });
  }
}
