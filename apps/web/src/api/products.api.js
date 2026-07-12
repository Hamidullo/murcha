import { apiFetch } from "./client.js";

/**
 * @param {{ search?: string, categoryId?: string }} [filters]
 * @returns {Promise<{ products: object[] }>}
 */
export function listProducts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  const query = params.toString();
  return apiFetch(`/products${query ? `?${query}` : ""}`);
}

/** @returns {Promise<object>} */
export function getProduct(id) {
  return apiFetch(`/products/${id}`);
}

/** @returns {Promise<object>} */
export function createProduct(dto) {
  return apiFetch("/products", { method: "POST", body: JSON.stringify(dto) });
}

/** @returns {Promise<object>} */
export function updateProduct(id, dto) {
  return apiFetch(`/products/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
}

/** @returns {Promise<void>} */
export function archiveProduct(id) {
  return apiFetch(`/products/${id}`, { method: "DELETE" });
}

/** @returns {Promise<{ prices: object[] }>} */
export function listCurrentPrices(productId) {
  return apiFetch(`/products/${productId}/prices/current`);
}

/** @returns {Promise<object>} */
export function addPrice(productId, dto) {
  return apiFetch(`/products/${productId}/prices`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/** @returns {Promise<{ variants: object[] }>} */
export function listVariants(productId) {
  return apiFetch(`/products/${productId}/variants`);
}

/** @returns {Promise<object>} */
export function addVariant(productId, dto) {
  return apiFetch(`/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/** @returns {Promise<void>} */
export function archiveVariant(productId, variantId) {
  return apiFetch(`/products/${productId}/variants/${variantId}`, { method: "DELETE" });
}

/** @returns {Promise<{ images: object[] }>} */
export function listImages(productId) {
  return apiFetch(`/products/${productId}/images`);
}

/**
 * @param {string} productId
 * @param {File} file
 * @returns {Promise<object>}
 */
export function uploadImage(productId, file) {
  const form = new FormData();
  form.append("image", file);
  return apiFetch(`/products/${productId}/images`, { method: "POST", body: form });
}

/** @returns {Promise<object>} */
export function setMainImage(productId, imageId) {
  return apiFetch(`/products/${productId}/images/${imageId}/main`, { method: "POST" });
}

/** @returns {Promise<void>} */
export function deleteImage(productId, imageId) {
  return apiFetch(`/products/${productId}/images/${imageId}`, { method: "DELETE" });
}

/** @returns {Promise<{ url: string }>} */
export function getImageUrl(productId, imageId) {
  return apiFetch(`/products/${productId}/images/${imageId}/url`);
}
