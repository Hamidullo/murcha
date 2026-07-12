import { ValidationError } from "./errors.js";

/**
 * @param {number} amount
 * @param {string} currency
 * @param {number} rate
 * @returns {number}
 */
export function convertToUzs(amount, currency, rate) {
  if (currency === "UZS") {
    return amount;
  }
  return amount * rate;
}

/**
 * Kompaniya kursi (agar bor bo'lsa) → aks holda CBU rasmiy kursi
 * (`exchangeRateMode: "manual"`da CBU'ga qaytilmaydi). `ProductPrice`/`Order`
 * USD'da bo'lsa sotuv vaqtida shu kurs bilan UZS'ga o'giriladi.
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {import("../modules/exchange-rates/exchange-rates.repository.js").ExchangeRatesRepository} exchangeRatesRepository
 * @param {string} companyId
 * @param {string} currency
 * @param {"cbu" | "manual"} mode
 * @returns {Promise<number>}
 */
export async function resolveExchangeRate(tx, exchangeRatesRepository, companyId, currency, mode) {
  const asOf = new Date();
  const companyRate = await exchangeRatesRepository.findLatest(tx, companyId, currency, asOf);
  if (companyRate) {
    return Number(companyRate.rate);
  }
  if (mode === "manual") {
    throw new ValidationError(`${currency} kursi belgilanmagan`);
  }
  const officialRate = await exchangeRatesRepository.findLatest(tx, null, currency, asOf);
  if (!officialRate) {
    throw new ValidationError(`${currency} kursi topilmadi`);
  }
  return Number(officialRate.rate);
}
