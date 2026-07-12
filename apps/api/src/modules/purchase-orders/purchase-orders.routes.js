import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import {
  createPurchaseOrderSchema,
  createPurchaseOrderItemSchema,
  receivePurchaseOrderSchema,
} from "./purchase-orders.schemas.js";
import { PurchaseOrdersRepository } from "./purchase-orders.repository.js";
import { WarehousesRepository } from "../warehouses/warehouses.repository.js";
import { ProductsRepository } from "../products/products.repository.js";
import { ProductUnitsRepository } from "../products/product-units.repository.js";
import { WarehouseDocsRepository } from "../warehouse-docs/warehouse-docs.repository.js";
import { PurchaseOrdersService } from "./purchase-orders.service.js";
import { PurchaseOrdersController } from "./purchase-orders.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const purchaseOrdersService = new PurchaseOrdersService({
  purchaseOrdersRepository: new PurchaseOrdersRepository(),
  warehousesRepository: new WarehousesRepository(),
  productsRepository: new ProductsRepository(),
  productUnitsRepository: new ProductUnitsRepository(),
  warehouseDocsRepository: new WarehouseDocsRepository(),
});
const purchaseOrdersController = new PurchaseOrdersController({ purchaseOrdersService });

export const purchaseOrdersRouter = Router();
purchaseOrdersRouter.use(requireAuth);

purchaseOrdersRouter.post(
  "/",
  requirePermission("warehouse.manage"),
  validate(createPurchaseOrderSchema),
  purchaseOrdersController.create,
);
purchaseOrdersRouter.get("/", purchaseOrdersController.list);
purchaseOrdersRouter.get("/:id", purchaseOrdersController.getById);

purchaseOrdersRouter.post(
  "/:id/items",
  requirePermission("warehouse.manage"),
  validate(createPurchaseOrderItemSchema),
  purchaseOrdersController.addItem,
);
purchaseOrdersRouter.delete(
  "/:id/items/:itemId",
  requirePermission("warehouse.manage"),
  purchaseOrdersController.removeItem,
);

purchaseOrdersRouter.post(
  "/:id/receive",
  requirePermission("warehouse.manage"),
  validate(receivePurchaseOrderSchema),
  purchaseOrdersController.receive,
);
