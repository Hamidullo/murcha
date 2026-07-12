import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createOrderSchema } from "./orders.schemas.js";
import { OrdersRepository } from "./orders.repository.js";
import { SalePointsRepository } from "../sale-points/sale-points.repository.js";
import { CounterpartiesRepository } from "../counterparties/counterparties.repository.js";
import { WarehousesRepository } from "../warehouses/warehouses.repository.js";
import { ProductsRepository } from "../products/products.repository.js";
import { ProductUnitsRepository } from "../products/product-units.repository.js";
import { ProductPricesRepository } from "../products/product-prices.repository.js";
import { UserAssignmentsRepository } from "../user-assignments/user-assignments.repository.js";
import { RolesRepository } from "../roles/roles.repository.js";
import { StockRepository } from "../stock/stock.repository.js";
import { StockMovementsRepository } from "../stock/stock-movements.repository.js";
import { WarehouseDocsRepository } from "../warehouse-docs/warehouse-docs.repository.js";
import { OrdersService } from "./orders.service.js";
import { OrdersController } from "./orders.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const ordersService = new OrdersService({
  ordersRepository: new OrdersRepository(),
  salePointsRepository: new SalePointsRepository(),
  counterpartiesRepository: new CounterpartiesRepository(),
  warehousesRepository: new WarehousesRepository(),
  productsRepository: new ProductsRepository(),
  productUnitsRepository: new ProductUnitsRepository(),
  productPricesRepository: new ProductPricesRepository(),
  userAssignmentsRepository: new UserAssignmentsRepository(),
  rolesRepository: new RolesRepository(),
  stockRepository: new StockRepository(),
  stockMovementsRepository: new StockMovementsRepository(),
  warehouseDocsRepository: new WarehouseDocsRepository(),
});
const ordersController = new OrdersController({ ordersService });

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.post("/", validate(createOrderSchema), ordersController.create);
ordersRouter.get("/", ordersController.list);
ordersRouter.get("/:id", ordersController.getById);
ordersRouter.post("/:id/confirm", requirePermission("orders.confirm"), ordersController.confirm);
ordersRouter.post("/:id/cancel", requirePermission("orders.confirm"), ordersController.cancel);
ordersRouter.post("/:id/pick", requirePermission("orders.confirm"), ordersController.pick);
ordersRouter.post("/:id/ship", requirePermission("orders.confirm"), ordersController.ship);
