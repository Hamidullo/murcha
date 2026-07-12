import { apiFetch } from "./client.js";

/** @returns {Promise<{ categories: object[] }>} */
export function listCategories() {
  return apiFetch("/categories");
}
