import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { createLeadSchema } from "@murcha/shared";
import { ShowcaseService } from "./showcase.service.js";
import { ShowcaseController } from "./showcase.controller.js";
import { ShowcaseRepository } from "./showcase.repository.js";
import { CompaniesRepository } from "../companies/companies.repository.js";
import { ProductsRepository } from "../products/products.repository.js";
import { ProductPricesRepository } from "../products/product-prices.repository.js";
import { ProductImagesRepository } from "../products/product-images.repository.js";
import { PriceTypesRepository } from "../price-types/price-types.repository.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const showcaseService = new ShowcaseService({
  companiesRepository: new CompaniesRepository(),
  productsRepository: new ProductsRepository(),
  productPricesRepository: new ProductPricesRepository(),
  productImagesRepository: new ProductImagesRepository(),
  priceTypesRepository: new PriceTypesRepository(),
  showcaseRepository: new ShowcaseRepository(),
});
const showcaseController = new ShowcaseController({ showcaseService });

// Lid spamining oldini olish — IP bo'yicha (auth.routes.js loginRateLimit
// naqshi).
const leadRateLimit = rateLimit({ windowSeconds: 10 * 60, max: 10, keyPrefix: "rl:lead" });

// Autentifikatsiyasiz — vitrina ochiq katalog (`requireAuth` yo'q).
export const showcaseRouter = Router();
showcaseRouter.get("/:slug", showcaseController.show);
showcaseRouter.post(
  "/:slug/leads",
  leadRateLimit,
  validate(createLeadSchema),
  showcaseController.createLead,
);
