/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). To'liq birliklar CRUD'i
 * TASKS.md'da alohida vazifa emas (tizim birliklari `seed.js`da urug'langan,
 * `companyId: null`) — faqat o'qish (mahsulot yaratish/tanlash formasi uchun).
 */
export class UnitsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Unit | null>}
   */
  async findById(tx, id) {
    return tx.unit.findUnique({ where: { id } });
  }

  /**
   * RLS (`units`da `company_id IS NULL OR company_id = ...`) tizim
   * birliklari + joriy kompaniya birliklarini qaytaradi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @returns {Promise<import("@prisma/client").Unit[]>}
   */
  async list(tx) {
    return tx.unit.findMany({ orderBy: { name: "asc" } });
  }
}
