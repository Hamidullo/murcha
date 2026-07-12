import { apiFetch } from "./client.js";

/**
 * @param {{ search?: string, warehouseId?: string }} [filters]
 * @returns {Promise<{ items: Array<{ productId: string, sku: string, nameUz: string, categoryId: string | null, baseUnitId: string, price: number, currency: string, availableQty: number | null }> }>}
 */
export function listCatalog(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
  const query = params.toString();
  return apiFetch(`/shop-catalog${query ? `?${query}` : ""}`);
}
