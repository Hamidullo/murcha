/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class NotificationsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Notification>}
   */
  async create(tx, data) {
    return tx.notification.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} userId
   * @param {{ unreadOnly?: boolean }} [filters]
   * @returns {Promise<import("@prisma/client").Notification[]>}
   */
  async listByUser(tx, userId, filters = {}) {
    return tx.notification.findMany({
      where: { userId, ...(filters.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Notification | null>}
   */
  async findById(tx, id) {
    return tx.notification.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Notification>}
   */
  async markRead(tx, id) {
    return tx.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  /**
   * Bugun shu `orderId`+`bucket` uchun qarz eslatmasi allaqachon
   * yuborilganmi — kunlik eslatma job'ining dublikat oldini olishi uchun
   * (`Notification.data` JSON ustuniga qidiradi, yangi migratsiyasiz).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {string} orderId
   * @param {string} bucket
   * @param {string} dateKey
   * @returns {Promise<boolean>}
   */
  async existsDebtReminderToday(tx, companyId, orderId, bucket, dateKey) {
    const found = await tx.notification.findFirst({
      where: {
        companyId,
        type: "debt.reminder",
        data: { path: ["orderId"], equals: orderId },
        AND: [
          { data: { path: ["bucket"], equals: bucket } },
          { data: { path: ["dateKey"], equals: dateKey } },
        ],
      },
    });
    return found !== null;
  }
}
