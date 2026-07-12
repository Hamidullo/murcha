import { apiFetch } from "./client.js";

/**
 * @param {import("@murcha/shared").loginSchema._type} dto
 * @returns {Promise<object>}
 */
export function login(dto) {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * @param {import("@murcha/shared").selectCompanySchema._type} dto
 * @returns {Promise<object>}
 */
export function selectCompany(dto) {
  return apiFetch("/auth/select-company", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * @returns {Promise<{ accessToken: string }>}
 */
export function refresh() {
  return apiFetch("/auth/refresh", { method: "POST" }, { skipAuthRetry: true });
}

/**
 * @returns {Promise<void>}
 */
export function logout() {
  return apiFetch("/auth/logout", { method: "POST" });
}

/**
 * @returns {Promise<{ user: object, company: object | null, roleId: string }>}
 */
export function me() {
  return apiFetch("/auth/me");
}
