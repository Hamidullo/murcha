import { listProductsQuerySchema } from "./products.schemas.js";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class ProductsController {
  /**
   * @param {{ productsService: import("./products.service.js").ProductsService }} deps
   */
  constructor({ productsService }) {
    this.productsService = productsService;
  }

  /**
   * `POST /api/v1/products`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const product = await this.productsService.create(req.auth, req.body);
      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products?search=&categoryId=`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listProductsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov parametrlari", parsed.error.issues);
      }
      const products = await this.productsService.list(req.auth, parsed.data);
      res.status(200).json({ products });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products/by-barcode/:barcode`
   * @type {import("express").RequestHandler}
   */
  getByBarcode = async (req, res, next) => {
    try {
      const product = await this.productsService.getByBarcode(req.auth, req.params.barcode);
      res.status(200).json(product);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const product = await this.productsService.getById(req.auth, req.params.id);
      res.status(200).json(product);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/products/:id`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const product = await this.productsService.update(req.auth, req.params.id, req.body);
      res.status(200).json(product);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/products/:id` — soft-delete (archive).
   * @type {import("express").RequestHandler}
   */
  archive = async (req, res, next) => {
    try {
      await this.productsService.archive(req.auth, req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/products/:id/units`
   * @type {import("express").RequestHandler}
   */
  addUnit = async (req, res, next) => {
    try {
      const productUnit = await this.productsService.addUnit(req.auth, req.params.id, req.body);
      res.status(201).json(productUnit);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products/:id/units`
   * @type {import("express").RequestHandler}
   */
  listUnits = async (req, res, next) => {
    try {
      const units = await this.productsService.listUnits(req.auth, req.params.id);
      res.status(200).json({ units });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/products/:id/units/:unitId`
   * @type {import("express").RequestHandler}
   */
  removeUnit = async (req, res, next) => {
    try {
      await this.productsService.removeUnit(req.auth, req.params.id, req.params.unitId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/products/:id/barcodes`
   * @type {import("express").RequestHandler}
   */
  addBarcode = async (req, res, next) => {
    try {
      const barcode = await this.productsService.addBarcode(req.auth, req.params.id, req.body);
      res.status(201).json(barcode);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products/:id/barcodes`
   * @type {import("express").RequestHandler}
   */
  listBarcodes = async (req, res, next) => {
    try {
      const barcodes = await this.productsService.listBarcodes(req.auth, req.params.id);
      res.status(200).json({ barcodes });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/products/:id/barcodes/:barcodeId`
   * @type {import("express").RequestHandler}
   */
  removeBarcode = async (req, res, next) => {
    try {
      await this.productsService.removeBarcode(req.auth, req.params.id, req.params.barcodeId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
