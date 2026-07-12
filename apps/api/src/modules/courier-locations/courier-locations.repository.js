/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class CourierLocationsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").CourierLocation>}
   */
  async create(tx, data) {
    return tx.courierLocation.create({ data });
  }

  /**
   * Retention — shu kompaniya doirasida `cutoff`dan eski yozuvlarni
   * o'chiradi (global cron o'rniga har yozuvda chaqiriladi, `courier-locations.service.js`).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {Date} cutoff
   * @returns {Promise<{ count: number }>}
   */
  async deleteOlderThan(tx, companyId, cutoff) {
    return tx.courierLocation.deleteMany({ where: { companyId, recordedAt: { lt: cutoff } } });
  }
}
