import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createWarehouseSchema, updateWarehouseSchema } from "./warehouses.schemas.js";
import { WarehousesRepository } from "./warehouses.repository.js";
import { WarehousesService } from "./warehouses.service.js";
import { WarehousesController } from "./warehouses.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const warehousesService = new WarehousesService({
  warehousesRepository: new WarehousesRepository(),
});
const warehousesController = new WarehousesController({ warehousesService });

export const warehousesRouter = Router();
warehousesRouter.use(requireAuth);
warehousesRouter.post(
  "/",
  requirePermission("warehouse.manage"),
  validate(createWarehouseSchema),
  warehousesController.create,
);
warehousesRouter.get("/", warehousesController.list);
warehousesRouter.get("/:id", warehousesController.getById);
warehousesRouter.patch(
  "/:id",
  requirePermission("warehouse.manage"),
  validate(updateWarehouseSchema),
  warehousesController.update,
);
