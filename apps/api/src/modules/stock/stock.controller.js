import {
  listStockQuerySchema,
  lowStockQuerySchema,
  averageCostQuerySchema,
} from "./stock.schemas.js";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class StockController {
  /**
   * @param {{ stockService: import("./stock.service.js").StockService }} deps
   */
  constructor({ stockService }) {
    this.stockService = stockService;
  }

  /**
   * `GET /api/v1/stock`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listStockQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const stock = await this.stockService.list(req.auth, parsed.data);
      res.status(200).json({ stock });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/stock/low`
   * @type {import("express").RequestHandler}
   */
  listLowStock = async (req, res, next) => {
    try {
      const parsed = lowStockQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const stock = await this.stockService.listLowStock(req.auth, parsed.data);
      res.status(200).json({ stock });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/stock/average-cost`
   * @type {import("express").RequestHandler}
   */
  averageCost = async (req, res, next) => {
    try {
      const parsed = averageCostQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const result = await this.stockService.averageCost(req.auth, parsed.data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
