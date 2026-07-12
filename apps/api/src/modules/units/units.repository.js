/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). To'liq birliklar CRUD'i
 * TASKS.md'da alohida vazifa emas (tizim birliklari `seed.js`da urug'langan,
 * `companyId: null`) — hozircha faqat mahsulot yaratishda `baseUnitId`
 * mavjudligini tekshirish uchun kerak.
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
}
