import { apiFetch } from "./client.js";

/** @returns {Promise<{ roles: object[] }>} */
export function listRoles() {
  return apiFetch("/roles");
}

/** @returns {Promise<{ permissions: object[] }>} */
export function listAllPermissions() {
  return apiFetch("/roles/permissions");
}

/** @returns {Promise<object>} */
export function createRole(dto) {
  return apiFetch("/roles", { method: "POST", body: JSON.stringify(dto) });
}

/** @returns {Promise<object>} */
export function updateRole(id, dto) {
  return apiFetch(`/roles/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
}

/** @returns {Promise<{ permissionIds: string[] }>} */
export function listRolePermissions(id) {
  return apiFetch(`/roles/${id}/permissions`);
}

/** @returns {Promise<void>} */
export function setRolePermissions(id, permissionIds) {
  return apiFetch(`/roles/${id}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionIds }),
  });
}
