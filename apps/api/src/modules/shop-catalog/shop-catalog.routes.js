import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { ProductsRepository } from "../products/products.repository.js";
import { ProductPricesRepository } from "../products/product-prices.repository.js";
import { SalePointsRepository } from "../sale-points/sale-points.repository.js";
import { UserAssignmentsRepository } from "../user-assignments/user-assignments.repository.js";
import { StockRepository } from "../stock/stock.repository.js";
import { ShopCatalogService } from "./shop-catalog.service.js";
import { ShopCatalogController } from "./shop-catalog.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const shopCatalogService = new ShopCatalogService({
  productsRepository: new ProductsRepository(),
  productPricesRepository: new ProductPricesRepository(),
  salePointsRepository: new SalePointsRepository(),
  userAssignmentsRepository: new UserAssignmentsRepository(),
  stockRepository: new StockRepository(),
});
const shopCatalogController = new ShopCatalogController({ shopCatalogService });

export const shopCatalogRouter = Router();
shopCatalogRouter.use(requireAuth);

shopCatalogRouter.get("/", shopCatalogController.list);
