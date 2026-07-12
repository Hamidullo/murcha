import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createCategorySchema, updateCategorySchema } from "./categories.schemas.js";
import { CategoriesRepository } from "./categories.repository.js";
import { CategoriesService } from "./categories.service.js";
import { CategoriesController } from "./categories.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const categoriesService = new CategoriesService({
  categoriesRepository: new CategoriesRepository(),
});
const categoriesController = new CategoriesController({ categoriesService });

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);
categoriesRouter.post(
  "/",
  requirePermission("products.manage"),
  validate(createCategorySchema),
  categoriesController.create,
);
categoriesRouter.get("/", categoriesController.list);
categoriesRouter.get("/:id", categoriesController.getById);
categoriesRouter.patch(
  "/:id",
  requirePermission("products.manage"),
  validate(updateCategorySchema),
  categoriesController.update,
);
