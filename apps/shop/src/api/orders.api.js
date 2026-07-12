import { apiFetch } from "./client.js";

/**
 * @param {import("@murcha/shared").createOrderSchema._type} dto
 * @returns {Promise<object>}
 */
export function createOrder(dto) {
  return apiFetch("/orders", { method: "POST", body: JSON.stringify(dto) });
}

/**
 * Backend `orders.view` ruxsatisiz chaqiruvchini avtomatik o'z sotuv
 * nuqtasiga cheklaydi (`OrdersService.list()`) — do'kon operatori faqat
 * shu bilan o'zining zakazlarini oladi, filtr shart emas.
 * @returns {Promise<{ orders: object[] }>}
 */
export function listOrders() {
  return apiFetch("/orders");
}

/**
 * @param {string} id
 * @returns {Promise<object>}
 */
export function getOrder(id) {
  return apiFetch(`/orders/${id}`);
}

/**
 * @param {string} id
 * @param {import("@murcha/shared").acceptOrderSchema._type} dto
 * @returns {Promise<object>}
 */
export function acceptOrder(id, dto) {
  return apiFetch(`/orders/${id}/accept`, { method: "POST", body: JSON.stringify(dto) });
}

/**
 * @param {string} id
 * @param {import("@murcha/shared").returnOrderSchema._type} dto
 * @returns {Promise<object>}
 */
export function returnOrder(id, dto) {
  return apiFetch(`/orders/${id}/return`, { method: "POST", body: JSON.stringify(dto) });
}
