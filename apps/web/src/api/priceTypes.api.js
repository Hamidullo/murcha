import { apiFetch } from "./client.js";

/** @returns {Promise<{ priceTypes: object[] }>} */
export function listPriceTypes() {
  return apiFetch("/price-types");
}
