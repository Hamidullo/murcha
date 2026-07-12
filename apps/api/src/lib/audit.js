import { uuidv7 } from "uuidv7";

/**
 * `AuditLogsRepository.create()`ning yupqa o'rovi — servislar bevosita
 * repository chaqirmasdan bir xil shaklda audit yozuvi qo'shishi uchun.
 * `req.ip` bu yerga o'tkazilmaydi (servis qatlami HTTP request'ni bilmaydi) —
 * `ip` maydoni hozircha bo'sh qoladi.
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {import("../modules/audit-logs/audit-logs.repository.js").AuditLogsRepository} auditLogsRepository
 * @param {{ companyId: string, userId: string | null, action: string, entityType: string, entityId: string, before?: object | null, after?: object | null }} data
 * @returns {Promise<import("@prisma/client").AuditLog>}
 */
export function logAudit(tx, auditLogsRepository, data) {
  return auditLogsRepository.create(tx, {
    id: uuidv7(),
    companyId: data.companyId,
    userId: data.userId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    before: data.before ?? null,
    after: data.after ?? null,
  });
}
