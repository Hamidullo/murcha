import { apiFetch } from "./client.js";

/** @returns {Promise<{ registers: object[] }>} */
export function listRegisters() {
  return apiFetch("/cash/registers");
}

/**
 * @param {object} dto
 * @returns {Promise<object>}
 */
export function createRegister(dto) {
  return apiFetch("/cash/registers", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * @param {string} id
 * @param {object} dto
 * @returns {Promise<object>}
 */
export function updateRegister(id, dto) {
  return apiFetch(`/cash/registers/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
}

/** @returns {Promise<{ categories: object[] }>} */
export function listExpenseCategories() {
  return apiFetch("/cash/expense-categories");
}

/**
 * @param {object} dto
 * @returns {Promise<object>}
 */
export function createExpenseCategory(dto) {
  return apiFetch("/cash/expense-categories", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * @param {{ cashRegisterId?: string, type?: string, from?: string, to?: string }} [filters]
 * @returns {Promise<{ transactions: object[] }>}
 */
export function listTransactions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.cashRegisterId) params.set("cashRegisterId", filters.cashRegisterId);
  if (filters.type) params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return apiFetch(`/cash/transactions${query ? `?${query}` : ""}`);
}

/**
 * @param {object} dto
 * @returns {Promise<object>}
 */
export function createTransaction(dto) {
  return apiFetch("/cash/transactions", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * @param {object} dto
 * @returns {Promise<object>}
 */
export function createTransfer(dto) {
  return apiFetch("/cash/transfers", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * @param {string} registerId
 * @returns {Promise<{ shifts: object[] }>}
 */
export function listShifts(registerId) {
  return apiFetch(`/cash/registers/${registerId}/shifts`);
}

/**
 * @param {string} registerId
 * @param {{ openingBalance: number }} dto
 * @returns {Promise<object>}
 */
export function openShift(registerId, dto) {
  return apiFetch(`/cash/registers/${registerId}/shifts`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * @param {string} shiftId
 * @param {{ countedBalance: number, comment?: string }} dto
 * @returns {Promise<object>}
 */
export function closeShift(shiftId, dto) {
  return apiFetch(`/cash/shifts/${shiftId}/close`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}
