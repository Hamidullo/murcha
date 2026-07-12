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
