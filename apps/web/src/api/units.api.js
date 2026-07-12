import { apiFetch } from "./client.js";

/** @returns {Promise<{ units: object[] }>} */
export function listUnits() {
  return apiFetch("/units");
}
