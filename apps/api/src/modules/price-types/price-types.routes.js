import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createPriceTypeSchema, updatePriceTypeSchema } from "./price-types.schemas.js";
import { PriceTypesRepository } from "./price-types.repository.js";
import { PriceTypesService } from "./price-types.service.js";
import { PriceTypesController } from "./price-types.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const priceTypesService = new PriceTypesService({
  priceTypesRepository: new PriceTypesRepository(),
});
const priceTypesController = new PriceTypesController({ priceTypesService });

export const priceTypesRouter = Router();
priceTypesRouter.use(requireAuth);
priceTypesRouter.post(
  "/",
  requirePermission("products.manage"),
  validate(createPriceTypeSchema),
  priceTypesController.create,
);
priceTypesRouter.get("/", priceTypesController.list);
priceTypesRouter.get("/:id", priceTypesController.getById);
priceTypesRouter.patch(
  "/:id",
  requirePermission("products.manage"),
  validate(updatePriceTypeSchema),
  priceTypesController.update,
);
