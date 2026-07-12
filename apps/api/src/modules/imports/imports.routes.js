import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { ImportsService } from "./imports.service.js";
import { ImportsController } from "./imports.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const importsService = new ImportsService();
const importsController = new ImportsController({ importsService });

export const importsRouter = Router();
importsRouter.use(requireAuth);

importsRouter.post(
  "/:type",
  requirePermission("products.manage"),
  importsController.parseUpload,
  importsController.create,
);
importsRouter.get("/:jobId", importsController.getStatus);
