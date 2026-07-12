import { apiFetch } from "./client.js";

/**
 * @param {{ status?: string, salePointId?: string, warehouseId?: string }} [filters]
 * @returns {Promise<{ orders: object[] }>}
 */
export function listOrders(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.salePointId) params.set("salePointId", filters.salePointId);
  if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
  const query = params.toString();
  return apiFetch(`/orders${query ? `?${query}` : ""}`);
}

/** @returns {Promise<object>} */
export function getOrder(id) {
  return apiFetch(`/orders/${id}`);
}

/** @returns {Promise<object>} */
export function confirmOrder(id) {
  return apiFetch(`/orders/${id}/confirm`, { method: "POST" });
}

/** @returns {Promise<object>} */
export function pickOrder(id) {
  return apiFetch(`/orders/${id}/pick`, { method: "POST" });
}

/**
 * @param {string} id
 * @param {{ items?: Array<{ orderItemId: string, qty: number }> }} [dto]
 * @returns {Promise<object>}
 */
export function shipOrder(id, dto = {}) {
  return apiFetch(`/orders/${id}/ship`, { method: "POST", body: JSON.stringify(dto) });
}

/** @returns {Promise<object>} */
export function cancelOrder(id) {
  return apiFetch(`/orders/${id}/cancel`, { method: "POST" });
}
