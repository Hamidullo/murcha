import { apiFetch } from "./client.js";

/**
 * @param {{ status?: string }} [filters]
 * @returns {Promise<{ deliveries: object[] }>}
 */
export function listDeliveries(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();
  return apiFetch(`/deliveries${query ? `?${query}` : ""}`);
}

/**
 * @param {string} id
 * @returns {Promise<object>}
 */
export function getDelivery(id) {
  return apiFetch(`/deliveries/${id}`);
}

/**
 * @param {{ courierMemberId: string, orderIds: string[] }} dto
 * @returns {Promise<object>}
 */
export function createDelivery(dto) {
  return apiFetch("/deliveries", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * @param {string} deliveryId
 * @param {string} orderId
 * @param {{ cashCollected?: number }} [dto]
 * @returns {Promise<object>}
 */
export function deliverStop(deliveryId, orderId, dto = {}) {
  return apiFetch(`/deliveries/${deliveryId}/orders/${orderId}/deliver`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
