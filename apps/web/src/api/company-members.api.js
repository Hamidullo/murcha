import { apiFetch } from "./client.js";

/** @returns {Promise<{ members: object[] }>} */
export function listEmployees() {
  return apiFetch("/company-members");
}

/** @returns {Promise<object>} */
export function getEmployee(id) {
  return apiFetch(`/company-members/${id}`);
}

/** @returns {Promise<object>} */
export function createEmployee(dto) {
  return apiFetch("/company-members", { method: "POST", body: JSON.stringify(dto) });
}

/** @returns {Promise<object>} */
export function updateEmployee(id, dto) {
  return apiFetch(`/company-members/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
}

/** @returns {Promise<void>} */
export function resetEmployeePassword(id) {
  return apiFetch(`/company-members/${id}/reset-password`, { method: "POST" });
}
