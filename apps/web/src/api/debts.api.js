import { apiFetch } from "./client.js";

/**
 * @param {string} counterpartyId
 * @returns {Promise<{ counterpartyId: string, currency: string, balance: number }>}
 */
export function getBalance(counterpartyId) {
  return apiFetch(`/debts/counterparties/${counterpartyId}/balance`);
}

/**
 * @param {string} counterpartyId
 * @param {{ from?: string, to?: string }} [filters]
 * @returns {Promise<object>}
 */
export function getStatement(counterpartyId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return apiFetch(`/debts/counterparties/${counterpartyId}/statement${query ? `?${query}` : ""}`);
}

/**
 * @param {{ asOf?: string }} [filters]
 * @returns {Promise<{ asOf: string, counterparties: object[] }>}
 */
export function getAging(filters = {}) {
  const params = new URLSearchParams();
  if (filters.asOf) params.set("asOf", filters.asOf);
  const query = params.toString();
  return apiFetch(`/debts/aging${query ? `?${query}` : ""}`);
}

/**
 * @param {object} dto
 * @returns {Promise<object>}
 */
export function createAdjustment(dto) {
  return apiFetch("/debts/adjustments", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * Akt sverki PDF'ni yuklab oladi va brauzerda saqlash oynasini ochadi.
 * @param {string} counterpartyId
 * @param {string} counterpartyName
 * @param {{ from?: string, to?: string }} [filters]
 * @returns {Promise<void>}
 */
export async function downloadStatementPdf(counterpartyId, counterpartyName, filters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  const res = await apiFetch(
    `/debts/counterparties/${counterpartyId}/statement.pdf${query ? `?${query}` : ""}`,
    {},
    { raw: true },
  );
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `akt-sverki-${counterpartyName}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
