import { listInventoryCountsQuerySchema } from "./inventory-counts.schemas.js";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class InventoryCountsController {
  /**
   * @param {{ inventoryCountsService: import("./inventory-counts.service.js").InventoryCountsService }} deps
   */
  constructor({ inventoryCountsService }) {
    this.inventoryCountsService = inventoryCountsService;
  }

  /**
   * `POST /api/v1/inventory-counts`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const count = await this.inventoryCountsService.create(req.auth, req.body);
      res.status(201).json(count);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/inventory-counts`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listInventoryCountsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const counts = await this.inventoryCountsService.list(req.auth, parsed.data);
      res.status(200).json({ counts });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/inventory-counts/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const count = await this.inventoryCountsService.getById(req.auth, req.params.id);
      res.status(200).json(count);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/inventory-counts/:id/approve`
   * @type {import("express").RequestHandler}
   */
  approve = async (req, res, next) => {
    try {
      const count = await this.inventoryCountsService.approve(req.auth, req.params.id);
      res.status(200).json(count);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/inventory-counts/:id/items/:itemId`
   * @type {import("express").RequestHandler}
   */
  submitCount = async (req, res, next) => {
    try {
      const item = await this.inventoryCountsService.submitCount(
        req.auth,
        req.params.id,
        req.params.itemId,
        req.body,
      );
      res.status(200).json(item);
    } catch (err) {
      next(err);
    }
  };
}
