import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import {
  createWarehouseDocSchema,
  updateWarehouseDocSchema,
  createWarehouseDocItemSchema,
} from "./warehouse-docs.schemas.js";
import { WarehouseDocsRepository } from "./warehouse-docs.repository.js";
import { WarehousesRepository } from "../warehouses/warehouses.repository.js";
import { ProductsRepository } from "../products/products.repository.js";
import { ProductUnitsRepository } from "../products/product-units.repository.js";
import { StockRepository } from "../stock/stock.repository.js";
import { StockMovementsRepository } from "../stock/stock-movements.repository.js";
import { CompaniesRepository } from "../companies/companies.repository.js";
import { WarehouseDocsService } from "./warehouse-docs.service.js";
import { WarehouseDocsController } from "./warehouse-docs.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const warehouseDocsService = new WarehouseDocsService({
  warehouseDocsRepository: new WarehouseDocsRepository(),
  warehousesRepository: new WarehousesRepository(),
  productsRepository: new ProductsRepository(),
  productUnitsRepository: new ProductUnitsRepository(),
  stockRepository: new StockRepository(),
  stockMovementsRepository: new StockMovementsRepository(),
  companiesRepository: new CompaniesRepository(),
});
const warehouseDocsController = new WarehouseDocsController({ warehouseDocsService });

export const warehouseDocsRouter = Router();
warehouseDocsRouter.use(requireAuth);

warehouseDocsRouter.post(
  "/",
  requirePermission("warehouse.manage"),
  validate(createWarehouseDocSchema),
  warehouseDocsController.create,
);
warehouseDocsRouter.get("/", warehouseDocsController.list);
warehouseDocsRouter.get("/:id", warehouseDocsController.getById);
warehouseDocsRouter.get("/:id/act.pdf", warehouseDocsController.exportActPdf);
warehouseDocsRouter.patch(
  "/:id",
  requirePermission("warehouse.manage"),
  validate(updateWarehouseDocSchema),
  warehouseDocsController.update,
);
warehouseDocsRouter.delete(
  "/:id",
  requirePermission("warehouse.manage"),
  warehouseDocsController.remove,
);
warehouseDocsRouter.post(
  "/:id/confirm",
  requirePermission("warehouse.manage"),
  warehouseDocsController.confirm,
);
warehouseDocsRouter.post(
  "/:id/cancel",
  requirePermission("warehouse.manage"),
  warehouseDocsController.cancel,
);

warehouseDocsRouter.post(
  "/:id/items",
  requirePermission("warehouse.manage"),
  validate(createWarehouseDocItemSchema),
  warehouseDocsController.addItem,
);
warehouseDocsRouter.delete(
  "/:id/items/:itemId",
  requirePermission("warehouse.manage"),
  warehouseDocsController.removeItem,
);
