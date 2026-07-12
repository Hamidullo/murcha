/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class CounterpartiesRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Counterparty>}
   */
  async create(tx, data) {
    return tx.counterparty.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Counterparty | null>}
   */
  async findById(tx, id) {
    return tx.counterparty.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ type?: string, search?: string }} [filters]
   * @returns {Promise<import("@prisma/client").Counterparty[]>}
   */
  async list(tx, companyId, filters = {}) {
    return tx.counterparty.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Counterparty>}
   */
  async update(tx, id, data) {
    return tx.counterparty.update({ where: { id }, data });
  }
}
