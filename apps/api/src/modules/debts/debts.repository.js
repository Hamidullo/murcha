/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). `debt_movements` —
 * immutable jurnal (DATABASE.md), shuning uchun bu yerda faqat `create` +
 * o'qish metodlari, hech qanday `update`/`delete` yo'q.
 */
export class DebtMovementsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").DebtMovement>}
   */
  async create(tx, data) {
    return tx.debtMovement.create({ data });
  }

  /**
   * Joriy balans — barcha yozuvlar yig'indisi (DATABASE.md invarianti).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {string} counterpartyId
   * @param {string} currency
   * @returns {Promise<number>}
   */
  async getBalance(tx, companyId, counterpartyId, currency) {
    const result = await tx.debtMovement.aggregate({
      where: { companyId, counterpartyId, currency },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  /**
   * Berilgan sanadan oldingi yozuvlar yig'indisi — statement'ning
   * boshlang'ich qoldig'i uchun.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {string} counterpartyId
   * @param {string} currency
   * @param {Date} before
   * @returns {Promise<number>}
   */
  async sumBefore(tx, companyId, counterpartyId, currency, before) {
    const result = await tx.debtMovement.aggregate({
      where: { companyId, counterpartyId, currency, createdAt: { lt: before } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {string} counterpartyId
   * @param {{ currency?: string, from?: Date, to?: Date }} [filters]
   * @returns {Promise<(import("@prisma/client").DebtMovement & { order: { number: string } | null })[]>}
   */
  async listByCounterparty(tx, companyId, counterpartyId, filters = {}) {
    const createdAtFilter = {};
    if (filters.from) createdAtFilter.gte = filters.from;
    if (filters.to) createdAtFilter.lte = filters.to;
    return tx.debtMovement.findMany({
      where: {
        companyId,
        counterpartyId,
        ...(filters.currency ? { currency: filters.currency } : {}),
        ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: { order: { select: { number: true } } },
    });
  }

  /**
   * Aging hisoboti uchun — `orderId` bog'langan barcha yozuvlar (order +
   * shu orderga tegishli payment/return kamaytirishlari), servis qatlamida
   * order bo'yicha netto qilinadi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ counterpartyId?: string }} [filters]
   * @returns {Promise<(import("@prisma/client").DebtMovement & { order: { number: string } | null, counterparty: { name: string } })[]>}
   */
  async listOrderLinkedMovements(tx, companyId, filters = {}) {
    return tx.debtMovement.findMany({
      where: {
        companyId,
        orderId: { not: null },
        ...(filters.counterpartyId ? { counterpartyId: filters.counterpartyId } : {}),
      },
      include: {
        order: { select: { number: true } },
        counterparty: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}
