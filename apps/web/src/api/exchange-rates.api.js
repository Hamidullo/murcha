import { apiFetch } from "./client.js";

/**
 * @param {string} [currency]
 * @returns {Promise<{ currency: string, rate: number, rateDate: string, source: "company" | "cbu" }>}
 */
export function getCurrentRate(currency = "USD") {
  return apiFetch(`/exchange-rates/current?currency=${currency}`);
}

/**
 * @param {object} dto
 * @returns {Promise<object>}
 */
export function setRate(dto) {
  return apiFetch("/exchange-rates", { method: "POST", body: JSON.stringify(dto) });
}
