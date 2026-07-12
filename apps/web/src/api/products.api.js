import { apiFetch } from "./client.js";

/**
 * @param {{ search?: string, categoryId?: string }} [filters]
 * @returns {Promise<{ products: object[] }>}
 */
export function listProducts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  const query = params.toString();
  return apiFetch(`/products${query ? `?${query}` : ""}`);
}
