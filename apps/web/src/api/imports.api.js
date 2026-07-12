import { apiFetch } from "./client.js";

/**
 * @param {"products" | "stock" | "counterparties"} type
 * @param {File} file
 * @returns {Promise<{ jobId: string }>}
 */
export function uploadImport(type, file) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch(`/imports/${type}`, { method: "POST", body: form });
}

/**
 * @param {string} jobId
 * @returns {Promise<{ id: string, state: string, result: object | null, failedReason: string | null }>}
 */
export function getImportStatus(jobId) {
  return apiFetch(`/imports/${jobId}`);
}
