import { useAuthStore } from "../stores/auth.store.js";

const BASE_URL = "/api/v1";

/** Backend `{ error: { code, message, details? } }` formatidagi xatoni ushlaydi. */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {number} status
   * @param {unknown} [details]
   */
  constructor(message, code, status, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * @param {Response} res
 * @returns {Promise<never>}
 */
async function throwApiError(res) {
  const body = await res.json().catch(() => null);
  const error = body?.error ?? {};
  throw new ApiError(
    error.message ?? "Server xatosi",
    error.code ?? "unknown",
    res.status,
    error.details,
  );
}

/**
 * `fetch` wrapper: refresh cookie uchun `credentials: "include"`, auth
 * store'dan `Authorization` header. 401 kelsa bir marta `refresh()` bilan
 * qayta urinadi (token muddati o'tgan bo'lishi mumkin).
 * @param {string} path — `/auth/login` kabi, `BASE_URL`ga qo'shiladi
 * @param {RequestInit} [options]
 * @param {{ skipAuthRetry?: boolean, raw?: boolean }} [config] — `raw: true` bo'lsa
 *   JSON parslanmaydi, xom `Response` qaytadi.
 * @returns {Promise<unknown>}
 */
export async function apiFetch(path, options = {}, config = {}) {
  const authStore = useAuthStore();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (authStore.accessToken) {
    headers.set("Authorization", `Bearer ${authStore.accessToken}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !config.skipAuthRetry) {
    const refreshed = await authStore.refresh().catch(() => false);
    if (refreshed) {
      return apiFetch(path, options, { ...config, skipAuthRetry: true });
    }
  }

  if (!res.ok) {
    await throwApiError(res);
  }

  if (config.raw) {
    return res;
  }
  if (res.status === 204) {
    return null;
  }
  return res.json();
}
