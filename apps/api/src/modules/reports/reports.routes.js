import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { OrdersRepository } from "../orders/orders.repository.js";
import { StockMovementsRepository } from "../stock/stock-movements.repository.js";
import { StockRepository } from "../stock/stock.repository.js";
import { ProductsRepository } from "../products/products.repository.js";
import { TransactionsRepository } from "../cash/transactions.repository.js";
import { DebtMovementsRepository } from "../debts/debts.repository.js";
import { ReportsService } from "./reports.service.js";
import { ReportsController } from "./reports.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const reportsService = new ReportsService({
  ordersRepository: new OrdersRepository(),
  stockMovementsRepository: new StockMovementsRepository(),
  stockRepository: new StockRepository(),
  productsRepository: new ProductsRepository(),
  transactionsRepository: new TransactionsRepository(),
  debtMovementsRepository: new DebtMovementsRepository(),
});
const reportsController = new ReportsController({ reportsService });

export const reportsRouter = Router();
reportsRouter.use(requireAuth);
reportsRouter.use(requirePermission("reports.view"));

reportsRouter.get("/sales", reportsController.getSales);
reportsRouter.get("/products", reportsController.getProducts);
reportsRouter.get("/stock-turnover", reportsController.getStockTurnover);
reportsRouter.get("/dashboard", reportsController.getDashboard);
