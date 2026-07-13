import { apiFetch } from "./client.js";

/** @returns {Promise<{ warehouses: object[] }>} */
export function listWarehouses() {
  return apiFetch("/warehouses");
}

/**
 * @param {import("@murcha/shared").createWarehouseSchema._type} dto
 * @returns {Promise<object>}
 */
export function createWarehouse(dto) {
  return apiFetch("/warehouses", { method: "POST", body: JSON.stringify(dto) });
}
