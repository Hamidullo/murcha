import { apiFetch } from "./client.js";

/**
 * @param {{ warehouseId?: string, status?: string }} [filters]
 * @returns {Promise<{ counts: object[] }>}
 */
export function listInventoryCounts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();
  return apiFetch(`/inventory-counts${query ? `?${query}` : ""}`);
}

/** @returns {Promise<object>} */
export function createInventoryCount(dto) {
  return apiFetch("/inventory-counts", { method: "POST", body: JSON.stringify(dto) });
}

/** @returns {Promise<object>} */
export function getInventoryCount(id) {
  return apiFetch(`/inventory-counts/${id}`);
}

/** @returns {Promise<object>} */
export function submitCount(countId, itemId, dto) {
  return apiFetch(`/inventory-counts/${countId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

/** @returns {Promise<object>} */
export function approveInventoryCount(id) {
  return apiFetch(`/inventory-counts/${id}/approve`, { method: "POST" });
}
