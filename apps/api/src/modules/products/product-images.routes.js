import { Router } from "express";
import { requirePermission } from "../../middleware/require-permission.js";
import { ProductImagesRepository } from "./product-images.repository.js";
import { ProductsRepository } from "./products.repository.js";
import { ProductImagesService } from "./product-images.service.js";
import { ProductImagesController } from "./product-images.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md). `requireAuth`ni ota
// router (`products.routes.js`) allaqachon o'rnatgan.
const productImagesService = new ProductImagesService({
  productImagesRepository: new ProductImagesRepository(),
  productsRepository: new ProductsRepository(),
});
const productImagesController = new ProductImagesController({ productImagesService });

// `mergeParams: true` — ota router'dagi `:id` (mahsulot ID) shu yerda ham
// ko'rinadi (product-prices.routes.js'dagi bilan bir xil pattern).
export const productImagesRouter = Router({ mergeParams: true });
productImagesRouter.post(
  "/",
  requirePermission("products.manage"),
  productImagesController.parseUpload,
  productImagesController.create,
);
productImagesRouter.get("/", productImagesController.list);
productImagesRouter.post(
  "/:imageId/main",
  requirePermission("products.manage"),
  productImagesController.setMain,
);
productImagesRouter.delete(
  "/:imageId",
  requirePermission("products.manage"),
  productImagesController.delete,
);
