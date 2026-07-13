import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requirePlatformAdmin } from "../../middleware/require-platform-admin.js";
import { updateSubscriptionSchema } from "./platform.schemas.js";
import { PlatformService } from "./platform.service.js";
import { PlatformController } from "./platform.controller.js";
import { PlatformRepository } from "./platform.repository.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const platformService = new PlatformService({ platformRepository: new PlatformRepository() });
const platformController = new PlatformController({ platformService });

export const platformRouter = Router();
platformRouter.use(requirePlatformAdmin);

platformRouter.get("/companies", platformController.listCompanies);
platformRouter.get("/companies/:id", platformController.getCompany);
platformRouter.patch(
  "/companies/:id/subscription",
  validate(updateSubscriptionSchema),
  platformController.updateSubscription,
);
