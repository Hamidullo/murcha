import { apiFetch } from "./client.js";

/**
 * @returns {Promise<{ counterpartyId: string, currency: string, balance: number }>}
 */
export function getMyBalance() {
  return apiFetch("/debts/me/balance");
}

/**
 * @param {{ from?: string, to?: string }} [filters]
 * @returns {Promise<object>}
 */
export function getMyStatement(filters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return apiFetch(`/debts/me/statement${query ? `?${query}` : ""}`);
}
