import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { updateCompanySchema } from "./companies.schemas.js";
import { CompaniesRepository } from "./companies.repository.js";
import { CompaniesService } from "./companies.service.js";
import { CompaniesController } from "./companies.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const companiesService = new CompaniesService({
  companiesRepository: new CompaniesRepository(),
});
const companiesController = new CompaniesController({ companiesService });

export const companiesRouter = Router();
companiesRouter.use(requireAuth);

companiesRouter.get("/me", companiesController.getMe);
companiesRouter.patch(
  "/me",
  requirePermission("companies.manage"),
  validate(updateCompanySchema),
  companiesController.updateMe,
);
companiesRouter.post(
  "/me/logo",
  requirePermission("companies.manage"),
  companiesController.parseUpload,
  companiesController.uploadLogo,
);
companiesRouter.get("/me/logo/url", companiesController.getLogoUrl);
