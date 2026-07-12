/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). Immutable jurnal — faqat `create` (yozish) va `list*` (o'qish). */
export class StockMovementsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").StockMovement>}
   */
  async create(tx, data) {
    return tx.stockMovement.create({ data });
  }

  /**
   * `qty > 0` (kirim yo'nalishidagi harakatlar) va `costPrice` mavjud
   * qatorlar — o'rtacha tannarx (`SUM(qty*costPrice)/SUM(qty)`) service
   * qatlamida shu ro'yxatdan hisoblanadi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ companyId: string, productId: string, warehouseId?: string }} filters
   * @returns {Promise<import("@prisma/client").StockMovement[]>}
   */
  async listPositiveWithCost(tx, filters) {
    return tx.stockMovement.findMany({
      where: {
        companyId: filters.companyId,
        productId: filters.productId,
        qty: { gt: 0 },
        costPrice: { not: null },
        ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      },
    });
  }

  /**
   * Sklad aylanmasi hisoboti uchun — davrdagi barcha harakatlar (kirim ham,
   * chiqim ham; `reports.service.js` chiqim (`qty < 0`) qatorlarini o'zi
   * ajratadi).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ from?: Date, to?: Date }} [filters]
   * @returns {Promise<import("@prisma/client").StockMovement[]>}
   */
  async listByPeriod(tx, companyId, filters = {}) {
    const { from, to } = filters;
    return tx.stockMovement.findMany({
      where: {
        companyId,
        ...(from || to
          ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
    });
  }
}
