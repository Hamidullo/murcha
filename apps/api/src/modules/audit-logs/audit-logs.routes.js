import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { AuditLogsRepository } from "./audit-logs.repository.js";
import { AuditLogsService } from "./audit-logs.service.js";
import { AuditLogsController } from "./audit-logs.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const auditLogsService = new AuditLogsService({
  auditLogsRepository: new AuditLogsRepository(),
});
const auditLogsController = new AuditLogsController({ auditLogsService });

export const auditLogsRouter = Router();
auditLogsRouter.use(requireAuth);

auditLogsRouter.get("/", requirePermission("audit.view"), auditLogsController.list);
