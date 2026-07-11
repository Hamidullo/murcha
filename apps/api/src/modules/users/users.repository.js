/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). Har metod tashqaridan
 * kelgan Prisma tranzaksiya (`tx`) bilan ishlaydi — `withTenant`/`withUserContext`
 * orqali chaqiriladi, o'zi tranzaksiya ochmaydi.
 */
export class UsersRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} phone
   * @returns {Promise<import("@prisma/client").User | null>}
   */
  async findByPhone(tx, phone) {
    return tx.user.findUnique({ where: { phone } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").User | null>}
   */
  async findById(tx, id) {
    return tx.user.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, phone: string, passwordHash: string, fullName: string }} data
   * @returns {Promise<import("@prisma/client").User>}
   */
  async create(tx, data) {
    return tx.user.create({ data });
  }
}
