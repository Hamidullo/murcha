import { apiFetch } from "./client.js";

/** @returns {Promise<{ salePoints: object[] }>} */
export function listSalePoints() {
  return apiFetch("/sale-points");
}

/** @returns {Promise<object>} */
export function getSalePoint(id) {
  return apiFetch(`/sale-points/${id}`);
}

/** @returns {Promise<object>} */
export function createSalePoint(dto) {
  return apiFetch("/sale-points", { method: "POST", body: JSON.stringify(dto) });
}

/** @returns {Promise<object>} */
export function updateSalePoint(id, dto) {
  return apiFetch(`/sale-points/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
}

/** @returns {Promise<{ operators: object[] }>} */
export function listOperators(salePointId) {
  return apiFetch(`/sale-points/${salePointId}/operators`);
}

/**
 * @param {string} salePointId
 * @param {string} phone
 * @returns {Promise<object>}
 */
export function assignOperator(salePointId, phone) {
  return apiFetch(`/sale-points/${salePointId}/operators`, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

/** @returns {Promise<void>} */
export function unassignOperator(salePointId, userId) {
  return apiFetch(`/sale-points/${salePointId}/operators/${userId}`, { method: "DELETE" });
}
