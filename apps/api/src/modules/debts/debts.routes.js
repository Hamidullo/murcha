import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createDebtAdjustmentSchema } from "./debts.schemas.js";
import { DebtMovementsRepository } from "./debts.repository.js";
import { SalePointsRepository } from "../sale-points/sale-points.repository.js";
import { CounterpartiesRepository } from "../counterparties/counterparties.repository.js";
import { UserAssignmentsRepository } from "../user-assignments/user-assignments.repository.js";
import { RolesRepository } from "../roles/roles.repository.js";
import { CompaniesRepository } from "../companies/companies.repository.js";
import { DebtsService } from "./debts.service.js";
import { DebtsController } from "./debts.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const debtsService = new DebtsService({
  debtMovementsRepository: new DebtMovementsRepository(),
  salePointsRepository: new SalePointsRepository(),
  counterpartiesRepository: new CounterpartiesRepository(),
  userAssignmentsRepository: new UserAssignmentsRepository(),
  rolesRepository: new RolesRepository(),
  companiesRepository: new CompaniesRepository(),
});
const debtsController = new DebtsController({ debtsService });

export const debtsRouter = Router();
debtsRouter.use(requireAuth);

debtsRouter.get("/me/balance", debtsController.getMyBalance);
debtsRouter.get("/me/statement", debtsController.getMyStatement);
debtsRouter.get("/counterparties/:id/balance", debtsController.getBalance);
debtsRouter.get("/counterparties/:id/statement", debtsController.getStatement);
debtsRouter.get("/counterparties/:id/statement.pdf", debtsController.exportStatementPdf);
debtsRouter.get("/aging", requirePermission("debts.view"), debtsController.getAging);
debtsRouter.post(
  "/adjustments",
  requirePermission("debts.manage"),
  validate(createDebtAdjustmentSchema),
  debtsController.createAdjustment,
);
