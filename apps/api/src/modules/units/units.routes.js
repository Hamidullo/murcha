import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { UnitsRepository } from "./units.repository.js";
import { UnitsService } from "./units.service.js";
import { UnitsController } from "./units.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const unitsService = new UnitsService({ unitsRepository: new UnitsRepository() });
const unitsController = new UnitsController({ unitsService });

export const unitsRouter = Router();
unitsRouter.use(requireAuth);
unitsRouter.get("/", unitsController.list);
