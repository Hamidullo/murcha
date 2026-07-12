import { listCounterpartiesQuerySchema } from "./counterparties.schemas.js";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class CounterpartiesController {
  /**
   * @param {{ counterpartiesService: import("./counterparties.service.js").CounterpartiesService }} deps
   */
  constructor({ counterpartiesService }) {
    this.counterpartiesService = counterpartiesService;
  }

  /**
   * `POST /api/v1/counterparties`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const counterparty = await this.counterpartiesService.create(req.auth, req.body);
      res.status(201).json(counterparty);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/counterparties`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listCounterpartiesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const counterparties = await this.counterpartiesService.list(req.auth, parsed.data);
      res.status(200).json({ counterparties });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/counterparties/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const counterparty = await this.counterpartiesService.getById(req.auth, req.params.id);
      res.status(200).json(counterparty);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/counterparties/:id`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const counterparty = await this.counterpartiesService.update(
        req.auth,
        req.params.id,
        req.body,
      );
      res.status(200).json(counterparty);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/counterparties/:id`
   * @type {import("express").RequestHandler}
   */
  archive = async (req, res, next) => {
    try {
      const counterparty = await this.counterpartiesService.archive(req.auth, req.params.id);
      res.status(200).json(counterparty);
    } catch (err) {
      next(err);
    }
  };
}
