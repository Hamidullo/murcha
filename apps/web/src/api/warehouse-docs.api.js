import { apiFetch } from "./client.js";

/**
 * @param {{ type?: string, status?: string, warehouseId?: string }} [filters]
 * @returns {Promise<{ docs: object[] }>}
 */
export function listWarehouseDocs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
  const query = params.toString();
  return apiFetch(`/warehouse-docs${query ? `?${query}` : ""}`);
}

/** @returns {Promise<object>} */
export function getWarehouseDoc(id) {
  return apiFetch(`/warehouse-docs/${id}`);
}

/** @returns {Promise<object>} */
export function createWarehouseDoc(dto) {
  return apiFetch("/warehouse-docs", { method: "POST", body: JSON.stringify(dto) });
}

/** @returns {Promise<object>} */
export function addWarehouseDocItem(docId, dto) {
  return apiFetch(`/warehouse-docs/${docId}/items`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/** @returns {Promise<void>} */
export function removeWarehouseDocItem(docId, itemId) {
  return apiFetch(`/warehouse-docs/${docId}/items/${itemId}`, { method: "DELETE" });
}

/** @returns {Promise<object>} */
export function confirmWarehouseDoc(id) {
  return apiFetch(`/warehouse-docs/${id}/confirm`, { method: "POST" });
}

/** @returns {Promise<object>} */
export function cancelWarehouseDoc(id) {
  return apiFetch(`/warehouse-docs/${id}/cancel`, { method: "POST" });
}
