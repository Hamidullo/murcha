import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import {
  createInventoryCountSchema,
  updateInventoryCountItemSchema,
} from "./inventory-counts.schemas.js";
import { InventoryCountsRepository } from "./inventory-counts.repository.js";
import { WarehousesRepository } from "../warehouses/warehouses.repository.js";
import { ProductsRepository } from "../products/products.repository.js";
import { StockRepository } from "../stock/stock.repository.js";
import { StockMovementsRepository } from "../stock/stock-movements.repository.js";
import { WarehouseDocsRepository } from "../warehouse-docs/warehouse-docs.repository.js";
import { InventoryCountsService } from "./inventory-counts.service.js";
import { InventoryCountsController } from "./inventory-counts.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const inventoryCountsService = new InventoryCountsService({
  inventoryCountsRepository: new InventoryCountsRepository(),
  warehousesRepository: new WarehousesRepository(),
  productsRepository: new ProductsRepository(),
  stockRepository: new StockRepository(),
  stockMovementsRepository: new StockMovementsRepository(),
  warehouseDocsRepository: new WarehouseDocsRepository(),
});
const inventoryCountsController = new InventoryCountsController({ inventoryCountsService });

export const inventoryCountsRouter = Router();
inventoryCountsRouter.use(requireAuth);

inventoryCountsRouter.post(
  "/",
  requirePermission("warehouse.manage"),
  validate(createInventoryCountSchema),
  inventoryCountsController.create,
);
inventoryCountsRouter.get("/", inventoryCountsController.list);
inventoryCountsRouter.get("/:id", inventoryCountsController.getById);
inventoryCountsRouter.post(
  "/:id/approve",
  requirePermission("warehouse.manage"),
  inventoryCountsController.approve,
);
inventoryCountsRouter.patch(
  "/:id/items/:itemId",
  requirePermission("warehouse.manage"),
  validate(updateInventoryCountItemSchema),
  inventoryCountsController.submitCount,
);
