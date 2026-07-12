import { withTenant } from "../../lib/tenant-context.js";

/** BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Faqat o'qish — yozish `lib/audit.js logAudit()` orqali. */
export class AuditLogsService {
  /**
   * @param {{ auditLogsRepository: import("./audit-logs.repository.js").AuditLogsRepository }} deps
   */
  constructor({ auditLogsRepository }) {
    this.auditLogsRepository = auditLogsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").listAuditLogsQuerySchema._type} filters
   * @returns {Promise<import("@prisma/client").AuditLog[]>}
   */
  async list(auth, filters) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.auditLogsRepository.list(tx, auth.companyId, filters),
    );
  }
}
