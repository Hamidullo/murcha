import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import {
  createProductSchema,
  updateProductSchema,
  createProductUnitSchema,
  createProductBarcodeSchema,
} from "./products.schemas.js";
import { ProductsRepository } from "./products.repository.js";
import { ProductUnitsRepository } from "./product-units.repository.js";
import { ProductBarcodesRepository } from "./product-barcodes.repository.js";
import { ProductsService } from "./products.service.js";
import { ProductsController } from "./products.controller.js";
import { CategoriesRepository } from "../categories/categories.repository.js";
import { UnitsRepository } from "../units/units.repository.js";
import { productPricesRouter } from "./product-prices.routes.js";
import { productVariantsRouter } from "./product-variants.routes.js";
import { productImagesRouter } from "./product-images.routes.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const productsService = new ProductsService({
  productsRepository: new ProductsRepository(),
  categoriesRepository: new CategoriesRepository(),
  unitsRepository: new UnitsRepository(),
  productUnitsRepository: new ProductUnitsRepository(),
  productBarcodesRepository: new ProductBarcodesRepository(),
});
const productsController = new ProductsController({ productsService });

export const productsRouter = Router();
productsRouter.use(requireAuth);
productsRouter.post(
  "/",
  requirePermission("products.manage"),
  validate(createProductSchema),
  productsController.create,
);
productsRouter.get("/", productsController.list);
productsRouter.get("/by-barcode/:barcode", productsController.getByBarcode);
productsRouter.get("/:id", productsController.getById);
productsRouter.patch(
  "/:id",
  requirePermission("products.manage"),
  validate(updateProductSchema),
  productsController.update,
);
productsRouter.delete("/:id", requirePermission("products.manage"), productsController.archive);

productsRouter.post(
  "/:id/units",
  requirePermission("products.manage"),
  validate(createProductUnitSchema),
  productsController.addUnit,
);
productsRouter.get("/:id/units", productsController.listUnits);
productsRouter.delete(
  "/:id/units/:unitId",
  requirePermission("products.manage"),
  productsController.removeUnit,
);

productsRouter.post(
  "/:id/barcodes",
  requirePermission("products.manage"),
  validate(createProductBarcodeSchema),
  productsController.addBarcode,
);
productsRouter.get("/:id/barcodes", productsController.listBarcodes);
productsRouter.delete(
  "/:id/barcodes/:barcodeId",
  requirePermission("products.manage"),
  productsController.removeBarcode,
);

productsRouter.use("/:id/prices", productPricesRouter);
productsRouter.use("/:id/variants", productVariantsRouter);
productsRouter.use("/:id/images", productImagesRouter);
