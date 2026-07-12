import { currentRateQuerySchema } from "@murcha/shared";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class ExchangeRatesController {
  /**
   * @param {{ exchangeRatesService: import("./exchange-rates.service.js").ExchangeRatesService }} deps
   */
  constructor({ exchangeRatesService }) {
    this.exchangeRatesService = exchangeRatesService;
  }

  /**
   * `GET /api/v1/exchange-rates/current`
   * @type {import("express").RequestHandler}
   */
  getCurrent = async (req, res, next) => {
    try {
      const parsed = currentRateQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const rate = await this.exchangeRatesService.getCurrentRate(req.auth, parsed.data.currency);
      res.status(200).json(rate);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/exchange-rates`
   * @type {import("express").RequestHandler}
   */
  setRate = async (req, res, next) => {
    try {
      const rate = await this.exchangeRatesService.setRate(req.auth, req.body);
      res.status(201).json(rate);
    } catch (err) {
      next(err);
    }
  };
}
