import { apiFetch } from "./client.js";

/**
 * `.xlsx` faylni yuklab oladi va brauzerda saqlash oynasini ochadi.
 * @param {"products" | "stock" | "counterparties"} type
 * @param {string} filename
 * @returns {Promise<void>}
 */
export async function downloadExport(type, filename) {
  const res = await apiFetch(`/exports/${type}`, {}, { raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
