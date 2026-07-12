import { listOrdersQuerySchema, shipOrderSchema } from "./orders.schemas.js";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class OrdersController {
  /**
   * @param {{ ordersService: import("./orders.service.js").OrdersService }} deps
   */
  constructor({ ordersService }) {
    this.ordersService = ordersService;
  }

  /**
   * `POST /api/v1/orders`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const order = await this.ordersService.create(req.auth, req.body);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/orders`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listOrdersQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const orders = await this.ordersService.list(req.auth, parsed.data);
      res.status(200).json({ orders });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/orders/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const order = await this.ordersService.getById(req.auth, req.params.id);
      res.status(200).json(order);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/orders/:id/confirm`
   * @type {import("express").RequestHandler}
   */
  confirm = async (req, res, next) => {
    try {
      const order = await this.ordersService.confirm(req.auth, req.params.id);
      res.status(200).json(order);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/orders/:id/cancel`
   * @type {import("express").RequestHandler}
   */
  cancel = async (req, res, next) => {
    try {
      const order = await this.ordersService.cancel(req.auth, req.params.id);
      res.status(200).json(order);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/orders/:id/pick`
   * @type {import("express").RequestHandler}
   */
  pick = async (req, res, next) => {
    try {
      const order = await this.ordersService.pick(req.auth, req.params.id);
      res.status(200).json(order);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/orders/:id/ship`
   * @type {import("express").RequestHandler}
   */
  ship = async (req, res, next) => {
    try {
      const parsed = shipOrderSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const doc = await this.ordersService.ship(req.auth, req.params.id, parsed.data);
      res.status(200).json(doc);
    } catch (err) {
      next(err);
    }
  };
}
