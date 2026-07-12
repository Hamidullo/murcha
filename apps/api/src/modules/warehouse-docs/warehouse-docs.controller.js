import { listWarehouseDocsQuerySchema } from "@murcha/shared";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class WarehouseDocsController {
  /**
   * @param {{ warehouseDocsService: import("./warehouse-docs.service.js").WarehouseDocsService }} deps
   */
  constructor({ warehouseDocsService }) {
    this.warehouseDocsService = warehouseDocsService;
  }

  /**
   * `POST /api/v1/warehouse-docs`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const doc = await this.warehouseDocsService.create(req.auth, req.body);
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/warehouse-docs`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listWarehouseDocsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const docs = await this.warehouseDocsService.list(req.auth, parsed.data);
      res.status(200).json({ docs });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/warehouse-docs/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const doc = await this.warehouseDocsService.getById(req.auth, req.params.id);
      res.status(200).json(doc);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/warehouse-docs/:id`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const doc = await this.warehouseDocsService.update(req.auth, req.params.id, req.body);
      res.status(200).json(doc);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/warehouse-docs/:id/confirm`
   * @type {import("express").RequestHandler}
   */
  confirm = async (req, res, next) => {
    try {
      const doc = await this.warehouseDocsService.confirm(req.auth, req.params.id);
      res.status(200).json(doc);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/warehouse-docs/:id/cancel`
   * @type {import("express").RequestHandler}
   */
  cancel = async (req, res, next) => {
    try {
      const doc = await this.warehouseDocsService.cancel(req.auth, req.params.id);
      res.status(200).json(doc);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/warehouse-docs/:id`
   * @type {import("express").RequestHandler}
   */
  remove = async (req, res, next) => {
    try {
      await this.warehouseDocsService.remove(req.auth, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/warehouse-docs/:id/items`
   * @type {import("express").RequestHandler}
   */
  addItem = async (req, res, next) => {
    try {
      const item = await this.warehouseDocsService.addItem(req.auth, req.params.id, req.body);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/warehouse-docs/:id/items/:itemId`
   * @type {import("express").RequestHandler}
   */
  removeItem = async (req, res, next) => {
    try {
      await this.warehouseDocsService.removeItem(req.auth, req.params.id, req.params.itemId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
