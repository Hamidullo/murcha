import { statementQuerySchema, agingQuerySchema } from "./debts.schemas.js";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class DebtsController {
  /**
   * @param {{ debtsService: import("./debts.service.js").DebtsService }} deps
   */
  constructor({ debtsService }) {
    this.debtsService = debtsService;
  }

  /**
   * `GET /api/v1/debts/counterparties/:id/balance`
   * @type {import("express").RequestHandler}
   */
  getBalance = async (req, res, next) => {
    try {
      const balance = await this.debtsService.getBalance(req.auth, req.params.id);
      res.status(200).json(balance);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/debts/counterparties/:id/statement`
   * @type {import("express").RequestHandler}
   */
  getStatement = async (req, res, next) => {
    try {
      const parsed = statementQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const statement = await this.debtsService.getStatement(req.auth, req.params.id, parsed.data);
      res.status(200).json(statement);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/debts/counterparties/:id/statement.pdf`
   * @type {import("express").RequestHandler}
   */
  exportStatementPdf = async (req, res, next) => {
    try {
      const parsed = statementQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const buffer = await this.debtsService.getStatementPdf(req.auth, req.params.id, parsed.data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="akt-sverki.pdf"');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/debts/aging`
   * @type {import("express").RequestHandler}
   */
  getAging = async (req, res, next) => {
    try {
      const parsed = agingQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const aging = await this.debtsService.getAging(req.auth, parsed.data);
      res.status(200).json(aging);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/debts/adjustments`
   * @type {import("express").RequestHandler}
   */
  createAdjustment = async (req, res, next) => {
    try {
      const movement = await this.debtsService.createAdjustment(req.auth, req.body);
      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/debts/me/balance`
   * @type {import("express").RequestHandler}
   */
  getMyBalance = async (req, res, next) => {
    try {
      const balance = await this.debtsService.getMyBalance(req.auth);
      res.status(200).json(balance);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/debts/me/statement`
   * @type {import("express").RequestHandler}
   */
  getMyStatement = async (req, res, next) => {
    try {
      const parsed = statementQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const statement = await this.debtsService.getMyStatement(req.auth, parsed.data);
      res.status(200).json(statement);
    } catch (err) {
      next(err);
    }
  };
}
