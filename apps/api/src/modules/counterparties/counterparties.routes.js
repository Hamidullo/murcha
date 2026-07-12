import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createCounterpartySchema, updateCounterpartySchema } from "./counterparties.schemas.js";
import { CounterpartiesRepository } from "./counterparties.repository.js";
import { CounterpartiesService } from "./counterparties.service.js";
import { CounterpartiesController } from "./counterparties.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const counterpartiesService = new CounterpartiesService({
  counterpartiesRepository: new CounterpartiesRepository(),
});
const counterpartiesController = new CounterpartiesController({ counterpartiesService });

export const counterpartiesRouter = Router();
counterpartiesRouter.use(requireAuth);

counterpartiesRouter.post(
  "/",
  requirePermission("counterparties.manage"),
  validate(createCounterpartySchema),
  counterpartiesController.create,
);
counterpartiesRouter.get("/", counterpartiesController.list);
counterpartiesRouter.get("/:id", counterpartiesController.getById);
counterpartiesRouter.patch(
  "/:id",
  requirePermission("counterparties.manage"),
  validate(updateCounterpartySchema),
  counterpartiesController.update,
);
counterpartiesRouter.delete(
  "/:id",
  requirePermission("counterparties.manage"),
  counterpartiesController.archive,
);
