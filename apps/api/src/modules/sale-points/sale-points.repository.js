/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class SalePointsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").SalePoint>}
   */
  async create(tx, data) {
    return tx.salePoint.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").SalePoint | null>}
   */
  async findById(tx, id) {
    return tx.salePoint.findUnique({ where: { id } });
  }

  /**
   * Har kontragentga bitta sotuv nuqtasi (`create()`da avtomatik ochiladi,
   * bo'lishilmaydi) — qarz eslatmasida "kim javobgar" degan savolga javob
   * berish uchun (Faza 8).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} counterpartyId
   * @returns {Promise<import("@prisma/client").SalePoint | null>}
   */
  async findByCounterpartyId(tx, counterpartyId) {
    return tx.salePoint.findFirst({ where: { counterpartyId } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @returns {Promise<import("@prisma/client").SalePoint[]>}
   */
  async list(tx, companyId) {
    return tx.salePoint.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").SalePoint>}
   */
  async update(tx, id, data) {
    return tx.salePoint.update({ where: { id }, data });
  }
}
