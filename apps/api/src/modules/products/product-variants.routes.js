import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import {
  createProductVariantSchema,
  updateProductVariantSchema,
} from "./product-variants.schemas.js";
import { ProductVariantsRepository } from "./product-variants.repository.js";
import { ProductsRepository } from "./products.repository.js";
import { ProductVariantsService } from "./product-variants.service.js";
import { ProductVariantsController } from "./product-variants.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md). `requireAuth`ni ota
// router (`products.routes.js`) allaqachon o'rnatgan.
const productVariantsService = new ProductVariantsService({
  productVariantsRepository: new ProductVariantsRepository(),
  productsRepository: new ProductsRepository(),
});
const productVariantsController = new ProductVariantsController({ productVariantsService });

// `mergeParams: true` — ota router'dagi `:id` (mahsulot ID) shu yerda ham
// ko'rinadi (product-prices.routes.js'dagi bilan bir xil pattern).
export const productVariantsRouter = Router({ mergeParams: true });
productVariantsRouter.post(
  "/",
  requirePermission("products.manage"),
  validate(createProductVariantSchema),
  productVariantsController.create,
);
productVariantsRouter.get("/", productVariantsController.list);
productVariantsRouter.get("/:variantId", productVariantsController.getById);
productVariantsRouter.patch(
  "/:variantId",
  requirePermission("products.manage"),
  validate(updateProductVariantSchema),
  productVariantsController.update,
);
productVariantsRouter.delete(
  "/:variantId",
  requirePermission("products.manage"),
  productVariantsController.archive,
);
