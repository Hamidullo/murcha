import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createExchangeRateSchema } from "./exchange-rates.schemas.js";
import { ExchangeRatesRepository } from "./exchange-rates.repository.js";
import { CompaniesRepository } from "../companies/companies.repository.js";
import { ExchangeRatesService } from "./exchange-rates.service.js";
import { ExchangeRatesController } from "./exchange-rates.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const exchangeRatesService = new ExchangeRatesService({
  exchangeRatesRepository: new ExchangeRatesRepository(),
  companiesRepository: new CompaniesRepository(),
});
const exchangeRatesController = new ExchangeRatesController({ exchangeRatesService });

export const exchangeRatesRouter = Router();
exchangeRatesRouter.use(requireAuth);

exchangeRatesRouter.get("/current", exchangeRatesController.getCurrent);
exchangeRatesRouter.post(
  "/",
  requirePermission("companies.manage"),
  validate(createExchangeRateSchema),
  exchangeRatesController.setRate,
);
