import { listAuditLogsQuerySchema } from "@murcha/shared";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class AuditLogsController {
  /**
   * @param {{ auditLogsService: import("./audit-logs.service.js").AuditLogsService }} deps
   */
  constructor({ auditLogsService }) {
    this.auditLogsService = auditLogsService;
  }

  /**
   * `GET /api/v1/audit-logs`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listAuditLogsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const logs = await this.auditLogsService.list(req.auth, parsed.data);
      res.status(200).json({ logs });
    } catch (err) {
      next(err);
    }
  };
}
