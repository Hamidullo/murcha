import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createProductPriceSchema } from "./product-prices.schemas.js";
import { ProductPricesRepository } from "./product-prices.repository.js";
import { ProductsRepository } from "./products.repository.js";
import { PriceTypesRepository } from "../price-types/price-types.repository.js";
import { ProductPricesService } from "./product-prices.service.js";
import { ProductPricesController } from "./product-prices.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md). `requireAuth`ni
// ota router (`products.routes.js`) allaqachon o'rnatgan, bu yerda faqat
// yozish uchun `requirePermission` qo'shiladi.
const productPricesService = new ProductPricesService({
  productPricesRepository: new ProductPricesRepository(),
  productsRepository: new ProductsRepository(),
  priceTypesRepository: new PriceTypesRepository(),
});
const productPricesController = new ProductPricesController({ productPricesService });

// `mergeParams: true` — ota router'dagi `:id` (mahsulot ID) shu yerda ham
// ko'rinadi (`Router({ mergeParams: true })`, Express standart pattern).
export const productPricesRouter = Router({ mergeParams: true });
productPricesRouter.post(
  "/",
  requirePermission("products.manage"),
  validate(createProductPriceSchema),
  productPricesController.create,
);
productPricesRouter.get("/current", productPricesController.current);
productPricesRouter.get("/", productPricesController.list);
