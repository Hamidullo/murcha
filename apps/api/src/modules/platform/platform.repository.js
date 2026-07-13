/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). Cross-tenant — `tx` doim
 * `withoutTenant` orqali keladi (`platform.service.js`), RLS'ni chetlab
 * o'tish shu modulning butun maqsadi (super-admin barcha kompaniyalarni
 * ko'rishi kerak).
 */
export class PlatformRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ search?: string }} [filters]
   * @returns {Promise<Array<import("@prisma/client").Company & { subscription: import("@prisma/client").Subscription | null }>>}
   */
  async listCompanies(tx, filters = {}) {
    return tx.company.findMany({
      where: {
        ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
      },
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<(import("@prisma/client").Company & { subscription: import("@prisma/client").Subscription | null }) | null>}
   */
  async getCompany(tx, id) {
    return tx.company.findUnique({ where: { id }, include: { subscription: true } });
  }

  /**
   * `Subscription.companyId` UNIQUE — mavjud bo'lmasa yaratadi (`id` faqat
   * shu holatda ishlatiladi), mavjud bo'lsa faqat berilgan maydonlarni
   * yangilaydi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ id: string, plan?: string, status?: string, paidUntil?: Date | null, limits?: object }} data
   * @returns {Promise<import("@prisma/client").Subscription>}
   */
  async upsertSubscription(tx, companyId, { id, ...updateData }) {
    return tx.subscription.upsert({
      where: { companyId },
      update: updateData,
      create: { id, companyId, plan: "free", status: "trial", limits: {}, ...updateData },
    });
  }
}
