import { apiFetch } from "./client.js";

/** @returns {Promise<object>} */
export function getDashboard() {
  return apiFetch("/reports/dashboard");
}

/**
 * @param {{ from?: string, to?: string }} [filters]
 * @returns {Promise<{ sales: object[] }>}
 */
export function getSales(filters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return apiFetch(`/reports/sales${query ? `?${query}` : ""}`);
}

/**
 * @param {{ from?: string, to?: string, limit?: number }} [filters]
 * @returns {Promise<{ products: object[] }>}
 */
export function getProducts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.limit) params.set("limit", String(filters.limit));
  const query = params.toString();
  return apiFetch(`/reports/products${query ? `?${query}` : ""}`);
}

/**
 * @param {{ from?: string, to?: string }} [filters]
 * @returns {Promise<{ products: object[] }>}
 */
export function getStockTurnover(filters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return apiFetch(`/reports/stock-turnover${query ? `?${query}` : ""}`);
}
