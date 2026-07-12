import { listPurchaseOrdersQuerySchema } from "./purchase-orders.schemas.js";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class PurchaseOrdersController {
  /**
   * @param {{ purchaseOrdersService: import("./purchase-orders.service.js").PurchaseOrdersService }} deps
   */
  constructor({ purchaseOrdersService }) {
    this.purchaseOrdersService = purchaseOrdersService;
  }

  /**
   * `POST /api/v1/purchase-orders`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const po = await this.purchaseOrdersService.create(req.auth, req.body);
      res.status(201).json(po);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/purchase-orders`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listPurchaseOrdersQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const orders = await this.purchaseOrdersService.list(req.auth, parsed.data);
      res.status(200).json({ orders });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/purchase-orders/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const po = await this.purchaseOrdersService.getById(req.auth, req.params.id);
      res.status(200).json(po);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/purchase-orders/:id/items`
   * @type {import("express").RequestHandler}
   */
  addItem = async (req, res, next) => {
    try {
      const item = await this.purchaseOrdersService.addItem(req.auth, req.params.id, req.body);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/purchase-orders/:id/items/:itemId`
   * @type {import("express").RequestHandler}
   */
  removeItem = async (req, res, next) => {
    try {
      await this.purchaseOrdersService.removeItem(req.auth, req.params.id, req.params.itemId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/purchase-orders/:id/receive`
   * @type {import("express").RequestHandler}
   */
  receive = async (req, res, next) => {
    try {
      const doc = await this.purchaseOrdersService.receive(req.auth, req.params.id, req.body);
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  };
}
