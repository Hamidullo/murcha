import { apiFetch } from "./client.js";

/**
 * @returns {Promise<{ warehouses: Array<{ id: string, name: string }> }>}
 */
export function listWarehouses() {
  return apiFetch("/warehouses");
}
