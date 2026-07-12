/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class CompanyMembersRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string, userId: string, roleId: string }} data
   * @returns {Promise<import("@prisma/client").CompanyMember>}
   */
  async create(tx, data) {
    return tx.companyMember.create({ data });
  }

  /**
   * Login paytida "bu user qaysi kompaniyaga a'zo" so'rovi — `withUserContext`
   * ichida chaqiriladi (RLS `company_members` o'z-egalik istisnosi, prisma/rls.sql).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} userId
   * @returns {Promise<import("@prisma/client").CompanyMember[]>}
   */
  async findByUserId(tx, userId) {
    return tx.companyMember.findMany({
      where: { userId, status: "active" },
      include: { company: true, role: true },
    });
  }

  /**
   * Hodim yaratishda dublikat a'zolikni oldindan tekshirish uchun
   * (`@@unique([companyId, userId])` — ilova darajasida oldindan
   * tekshiruv, CLAUDE.md konvensiyasi).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {string} userId
   * @returns {Promise<import("@prisma/client").CompanyMember | null>}
   */
  async findByCompanyAndUser(tx, companyId, userId) {
    return tx.companyMember.findUnique({ where: { companyId_userId: { companyId, userId } } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<(import("@prisma/client").CompanyMember & { user: import("@prisma/client").User, role: import("@prisma/client").Role }) | null>}
   */
  async findById(tx, id) {
    return tx.companyMember.findUnique({ where: { id }, include: { user: true, role: true } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @returns {Promise<Array<import("@prisma/client").CompanyMember & { user: import("@prisma/client").User, role: import("@prisma/client").Role }>>}
   */
  async list(tx, companyId) {
    return tx.companyMember.findMany({
      where: { companyId },
      include: { user: true, role: true },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").CompanyMember>}
   */
  async update(tx, id, data) {
    return tx.companyMember.update({ where: { id }, data });
  }
}
