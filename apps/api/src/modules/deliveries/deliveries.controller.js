import { listDeliveriesQuerySchema, deliverStopSchema } from "./deliveries.schemas.js";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class DeliveriesController {
  /**
   * @param {{ deliveriesService: import("./deliveries.service.js").DeliveriesService }} deps
   */
  constructor({ deliveriesService }) {
    this.deliveriesService = deliveriesService;
  }

  /**
   * `POST /api/v1/deliveries`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const delivery = await this.deliveriesService.create(req.auth, req.body);
      res.status(201).json(delivery);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/deliveries`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listDeliveriesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const deliveries = await this.deliveriesService.list(req.auth, parsed.data);
      res.status(200).json({ deliveries });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/deliveries/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const delivery = await this.deliveriesService.getById(req.auth, req.params.id);
      res.status(200).json(delivery);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/deliveries/:id/orders/:orderId/deliver`
   * @type {import("express").RequestHandler}
   */
  deliverStop = async (req, res, next) => {
    try {
      const parsed = deliverStopSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const stop = await this.deliveriesService.deliverStop(
        req.auth,
        req.params.id,
        req.params.orderId,
        parsed.data,
      );
      res.status(200).json(stop);
    } catch (err) {
      next(err);
    }
  };
}
