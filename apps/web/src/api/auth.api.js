import { apiFetch } from "./client.js";

/**
 * @param {import("@murcha/shared").registerSchema._type & { demo?: boolean }} dto
 * @returns {Promise<object>}
 */
export function register(dto) {
  return apiFetch("/auth/register", { method: "POST", body: JSON.stringify(dto) });
}

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

/**
 * @param {import("@murcha/shared").forgotPasswordSchema._type} dto
 * @returns {Promise<void>}
 */
export function forgotPassword(dto) {
  return apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * @param {import("@murcha/shared").resetPasswordSchema._type} dto
 * @returns {Promise<void>}
 */
export function resetPassword(dto) {
  return apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * @param {import("@murcha/shared").setPasswordSchema._type} dto
 * @returns {Promise<void>}
 */
export function setPassword(dto) {
  return apiFetch("/auth/set-password", { method: "POST", body: JSON.stringify(dto) });
}
