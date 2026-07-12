import { listTransactionsQuerySchema } from "@murcha/shared";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class CashController {
  /**
   * @param {{ cashService: import("./cash.service.js").CashService }} deps
   */
  constructor({ cashService }) {
    this.cashService = cashService;
  }

  /**
   * `POST /api/v1/cash/registers`
   * @type {import("express").RequestHandler}
   */
  createRegister = async (req, res, next) => {
    try {
      const register = await this.cashService.createRegister(req.auth, req.body);
      res.status(201).json(register);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/cash/registers`
   * @type {import("express").RequestHandler}
   */
  listRegisters = async (req, res, next) => {
    try {
      const registers = await this.cashService.listRegisters(req.auth);
      res.status(200).json({ registers });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/cash/registers/:id`
   * @type {import("express").RequestHandler}
   */
  updateRegister = async (req, res, next) => {
    try {
      const register = await this.cashService.updateRegister(req.auth, req.params.id, req.body);
      res.status(200).json(register);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/cash/expense-categories`
   * @type {import("express").RequestHandler}
   */
  createExpenseCategory = async (req, res, next) => {
    try {
      const category = await this.cashService.createExpenseCategory(req.auth, req.body);
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/cash/expense-categories`
   * @type {import("express").RequestHandler}
   */
  listExpenseCategories = async (req, res, next) => {
    try {
      const categories = await this.cashService.listExpenseCategories(req.auth);
      res.status(200).json({ categories });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/cash/expense-categories/:id`
   * @type {import("express").RequestHandler}
   */
  updateExpenseCategory = async (req, res, next) => {
    try {
      const category = await this.cashService.updateExpenseCategory(
        req.auth,
        req.params.id,
        req.body,
      );
      res.status(200).json(category);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/cash/transactions`
   * @type {import("express").RequestHandler}
   */
  createTransaction = async (req, res, next) => {
    try {
      const transaction = await this.cashService.createTransaction(req.auth, req.body);
      res.status(201).json(transaction);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/cash/transfers`
   * @type {import("express").RequestHandler}
   */
  transfer = async (req, res, next) => {
    try {
      const result = await this.cashService.transfer(req.auth, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/cash/transactions`
   * @type {import("express").RequestHandler}
   */
  listTransactions = async (req, res, next) => {
    try {
      const parsed = listTransactionsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const transactions = await this.cashService.listTransactions(req.auth, parsed.data);
      res.status(200).json({ transactions });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/cash/registers/:id/shifts`
   * @type {import("express").RequestHandler}
   */
  openShift = async (req, res, next) => {
    try {
      const shift = await this.cashService.openShift(req.auth, req.params.id, req.body);
      res.status(201).json(shift);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/cash/shifts/:id/close`
   * @type {import("express").RequestHandler}
   */
  closeShift = async (req, res, next) => {
    try {
      const shift = await this.cashService.closeShift(req.auth, req.params.id, req.body);
      res.status(200).json(shift);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/cash/registers/:id/shifts`
   * @type {import("express").RequestHandler}
   */
  listShifts = async (req, res, next) => {
    try {
      const shifts = await this.cashService.listShifts(req.auth, req.params.id);
      res.status(200).json({ shifts });
    } catch (err) {
      next(err);
    }
  };
}
