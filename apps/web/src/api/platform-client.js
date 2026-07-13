import { usePlatformAuthStore } from "../stores/platform-auth.store.js";
import { ApiError } from "./client.js";

const BASE_URL = "/api/v1";

/**
 * `client.js apiFetch()`dagi bilan bir xil naqsh, lekin oddiyroq — platform
 * token uchun refresh/cookie oqimi yo'q (`platform-auth.store.js`da
 * hujjatlangan MVP soddalashtirish): 401 kelsa faqat xato otiladi, chaqiruvchi
 * (`PlatformLoginPage.vue`ga yo'naltirish) o'zi hal qiladi.
 * @param {string} path — `/platform/companies` kabi, `BASE_URL`ga qo'shiladi
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>}
 */
export async function platformApiFetch(path, options = {}) {
  const platformAuthStore = usePlatformAuthStore();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (platformAuthStore.accessToken) {
    headers.set("Authorization", `Bearer ${platformAuthStore.accessToken}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    platformAuthStore.logout();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error = body?.error ?? {};
    throw new ApiError(
      error.message ?? "Server xatosi",
      error.code ?? "unknown",
      res.status,
      error.details,
    );
  }

  if (res.status === 204) {
    return null;
  }
  return res.json();
}
