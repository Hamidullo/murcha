import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createProductSchema, updateProductSchema } from "./products.schemas.js";
import { ProductsRepository } from "./products.repository.js";
import { ProductsService } from "./products.service.js";
import { ProductsController } from "./products.controller.js";
import { CategoriesRepository } from "../categories/categories.repository.js";
import { UnitsRepository } from "../units/units.repository.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const productsService = new ProductsService({
  productsRepository: new ProductsRepository(),
  categoriesRepository: new CategoriesRepository(),
  unitsRepository: new UnitsRepository(),
});
const productsController = new ProductsController({ productsService });

export const productsRouter = Router();
productsRouter.use(requireAuth);
productsRouter.post(
  "/",
  requirePermission("products.manage"),
  validate(createProductSchema),
  productsController.create,
);
productsRouter.get("/", productsController.list);
productsRouter.get("/:id", productsController.getById);
productsRouter.patch(
  "/:id",
  requirePermission("products.manage"),
  validate(updateProductSchema),
  productsController.update,
);
productsRouter.delete("/:id", requirePermission("products.manage"), productsController.archive);
