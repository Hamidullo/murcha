import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createPaymentSchema } from "./payments.schemas.js";
import { PaymentsRepository } from "./payments.repository.js";
import { DebtMovementsRepository } from "../debts/debts.repository.js";
import { CounterpartiesRepository } from "../counterparties/counterparties.repository.js";
import { RolesRepository } from "../roles/roles.repository.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsController } from "./payments.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const paymentsService = new PaymentsService({
  paymentsRepository: new PaymentsRepository(),
  debtMovementsRepository: new DebtMovementsRepository(),
  counterpartiesRepository: new CounterpartiesRepository(),
  rolesRepository: new RolesRepository(),
});
const paymentsController = new PaymentsController({ paymentsService });

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

paymentsRouter.post(
  "/",
  requirePermission("debts.manage"),
  validate(createPaymentSchema),
  paymentsController.create,
);
