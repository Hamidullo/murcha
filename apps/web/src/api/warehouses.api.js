import { apiFetch } from "./client.js";

/** @returns {Promise<{ warehouses: object[] }>} */
export function listWarehouses() {
  return apiFetch("/warehouses");
}
