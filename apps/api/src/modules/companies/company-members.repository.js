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
}
