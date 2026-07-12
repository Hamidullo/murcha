import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { StockRepository } from "./stock.repository.js";
import { StockMovementsRepository } from "./stock-movements.repository.js";
import { StockService } from "./stock.service.js";
import { StockController } from "./stock.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const stockService = new StockService({
  stockRepository: new StockRepository(),
  stockMovementsRepository: new StockMovementsRepository(),
});
const stockController = new StockController({ stockService });

export const stockRouter = Router();
stockRouter.use(requireAuth);

stockRouter.get("/", stockController.list);
stockRouter.get("/low", stockController.listLowStock);
stockRouter.get("/average-cost", stockController.averageCost);
