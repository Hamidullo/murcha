import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { ProductsRepository } from "../products/products.repository.js";
import { StockRepository } from "../stock/stock.repository.js";
import { CounterpartiesRepository } from "../counterparties/counterparties.repository.js";
import { ExportsService } from "./exports.service.js";
import { ExportsController } from "./exports.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const exportsService = new ExportsService({
  productsRepository: new ProductsRepository(),
  stockRepository: new StockRepository(),
  counterpartiesRepository: new CounterpartiesRepository(),
});
const exportsController = new ExportsController({ exportsService });

export const exportsRouter = Router();
exportsRouter.use(requireAuth);

exportsRouter.get("/products", exportsController.exportProducts);
exportsRouter.get("/stock", exportsController.exportStock);
exportsRouter.get("/counterparties", exportsController.exportCounterparties);
