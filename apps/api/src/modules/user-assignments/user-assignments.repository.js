/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). O'z routes'i yo'q — boshqa
 * modullarga (masalan `sale-points`) to'g'ridan-to'g'ri DI orqali ulanadi
 * (PO/inventarizatsiya'dagi kabi repository-darajasidagi kompozitsiya).
 */
export class UserAssignmentsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {string} userId
   * @returns {Promise<import("@prisma/client").CompanyMember | null>}
   */
  async findCompanyMember(tx, companyId, userId) {
    return tx.companyMember.findUnique({ where: { companyId_userId: { companyId, userId } } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyMemberId
   * @param {string} targetType
   * @param {string} targetId
   * @returns {Promise<import("@prisma/client").UserAssignment | null>}
   */
  async findOne(tx, companyMemberId, targetType, targetId) {
    return tx.userAssignment.findFirst({ where: { companyMemberId, targetType, targetId } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyMemberId: string, targetType: string, targetId: string }} data
   * @returns {Promise<import("@prisma/client").UserAssignment>}
   */
  async create(tx, data) {
    return tx.userAssignment.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} targetType
   * @param {string} targetId
   * @returns {Promise<Array<import("@prisma/client").UserAssignment & { companyMember: { user: { id: string, fullName: string, phone: string } } }>>}
   */
  async listByTarget(tx, targetType, targetId) {
    return tx.userAssignment.findMany({
      where: { targetType, targetId },
      include: {
        companyMember: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").UserAssignment>}
   */
  async remove(tx, id) {
    return tx.userAssignment.delete({ where: { id } });
  }

  /**
   * Joriy foydalanuvchi qaysi sotuv nuqtasiga biriktirilganini topadi
   * (do'kon operatori — `apps/shop` uchun asosiy so'rov).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {string} userId
   * @returns {Promise<string | null>}
   */
  async findSalePointIdForUser(tx, companyId, userId) {
    const assignment = await tx.userAssignment.findFirst({
      where: { targetType: "sale_point", companyMember: { companyId, userId } },
    });
    return assignment?.targetId ?? null;
  }
}
