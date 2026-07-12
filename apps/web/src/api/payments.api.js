import { apiFetch } from "./client.js";

/**
 * @param {object} dto
 * @returns {Promise<object>}
 */
export function createPayment(dto) {
  return apiFetch("/payments", { method: "POST", body: JSON.stringify(dto) });
}
