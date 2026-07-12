import {
  salesReportQuerySchema,
  productsReportQuerySchema,
  stockTurnoverQuerySchema,
} from "./reports.schemas.js";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class ReportsController {
  /**
   * @param {{ reportsService: import("./reports.service.js").ReportsService }} deps
   */
  constructor({ reportsService }) {
    this.reportsService = reportsService;
  }

  /**
   * `GET /api/v1/reports/sales`
   * @type {import("express").RequestHandler}
   */
  getSales = async (req, res, next) => {
    try {
      const parsed = salesReportQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const sales = await this.reportsService.getSalesDynamics(req.auth, parsed.data);
      res.status(200).json({ sales });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/reports/products`
   * @type {import("express").RequestHandler}
   */
  getProducts = async (req, res, next) => {
    try {
      const parsed = productsReportQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const products = await this.reportsService.getProductsReport(req.auth, parsed.data);
      res.status(200).json({ products });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/reports/stock-turnover`
   * @type {import("express").RequestHandler}
   */
  getStockTurnover = async (req, res, next) => {
    try {
      const parsed = stockTurnoverQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const products = await this.reportsService.getStockTurnover(req.auth, parsed.data);
      res.status(200).json({ products });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/reports/dashboard`
   * @type {import("express").RequestHandler}
   */
  getDashboard = async (req, res, next) => {
    try {
      const dashboard = await this.reportsService.getDashboard(req.auth);
      res.status(200).json(dashboard);
    } catch (err) {
      next(err);
    }
  };
}
