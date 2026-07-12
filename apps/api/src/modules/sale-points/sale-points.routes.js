import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import {
  createSalePointSchema,
  updateSalePointSchema,
  assignOperatorSchema,
} from "./sale-points.schemas.js";
import { SalePointsRepository } from "./sale-points.repository.js";
import { CounterpartiesRepository } from "../counterparties/counterparties.repository.js";
import { PriceTypesRepository } from "../price-types/price-types.repository.js";
import { UserAssignmentsRepository } from "../user-assignments/user-assignments.repository.js";
import { UsersRepository } from "../users/users.repository.js";
import { SalePointsService } from "./sale-points.service.js";
import { SalePointsController } from "./sale-points.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const salePointsService = new SalePointsService({
  salePointsRepository: new SalePointsRepository(),
  counterpartiesRepository: new CounterpartiesRepository(),
  priceTypesRepository: new PriceTypesRepository(),
  userAssignmentsRepository: new UserAssignmentsRepository(),
  usersRepository: new UsersRepository(),
});
const salePointsController = new SalePointsController({ salePointsService });

export const salePointsRouter = Router();
salePointsRouter.use(requireAuth);

salePointsRouter.post(
  "/",
  requirePermission("sale_points.manage"),
  validate(createSalePointSchema),
  salePointsController.create,
);
salePointsRouter.get("/", salePointsController.list);
salePointsRouter.get("/:id", salePointsController.getById);
salePointsRouter.patch(
  "/:id",
  requirePermission("sale_points.manage"),
  validate(updateSalePointSchema),
  salePointsController.update,
);
salePointsRouter.get("/:id/operators", salePointsController.listOperators);
salePointsRouter.post(
  "/:id/operators",
  requirePermission("sale_points.manage"),
  validate(assignOperatorSchema),
  salePointsController.assignOperator,
);
salePointsRouter.delete(
  "/:id/operators/:userId",
  requirePermission("sale_points.manage"),
  salePointsController.unassignOperator,
);
