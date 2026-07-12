import { apiFetch } from "./client.js";

/** @returns {Promise<object>} */
export function getMe() {
  return apiFetch("/companies/me");
}

/**
 * @param {object} dto
 * @returns {Promise<object>}
 */
export function updateMe(dto) {
  return apiFetch("/companies/me", { method: "PATCH", body: JSON.stringify(dto) });
}

/**
 * @param {File} file
 * @returns {Promise<object>}
 */
export function uploadLogo(file) {
  const form = new FormData();
  form.append("logo", file);
  return apiFetch("/companies/me/logo", { method: "POST", body: form });
}

/** @returns {Promise<{ url: string | null }>} */
export function getLogoUrl() {
  return apiFetch("/companies/me/logo/url");
}
