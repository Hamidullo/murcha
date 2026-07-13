import { platformApiFetch } from "./platform-client.js";

/**
 * @param {{ search?: string }} [filters]
 * @returns {Promise<{ companies: object[] }>}
 */
export function listCompanies(filters = {}) {
  const query = filters.search ? `?search=${encodeURIComponent(filters.search)}` : "";
  return platformApiFetch(`/platform/companies${query}`);
}

/**
 * @param {string} id
 * @returns {Promise<object>}
 */
export function getCompany(id) {
  return platformApiFetch(`/platform/companies/${id}`);
}

/**
 * @param {string} id
 * @param {object} dto
 * @returns {Promise<object>}
 */
export function updateSubscription(id, dto) {
  return platformApiFetch(`/platform/companies/${id}/subscription`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}
