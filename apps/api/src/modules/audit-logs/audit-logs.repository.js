/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). AuditLog — immutable (faqat create). */
export class AuditLogsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").AuditLog>}
   */
  async create(tx, data) {
    return tx.auditLog.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ entityType?: string, entityId?: string, userId?: string, from?: Date, to?: Date }} [filters]
   * @returns {Promise<import("@prisma/client").AuditLog[]>}
   */
  async list(tx, companyId, filters = {}) {
    const { entityType, entityId, userId, from, to } = filters;
    return tx.auditLog.findMany({
      where: {
        companyId,
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(userId ? { userId } : {}),
        ...(from || to
          ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      include: { user: { select: { fullName: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
