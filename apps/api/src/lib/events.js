import { EventEmitter } from "node:events";

/**
 * Domen hodisalari uchun umumiy shina (CLAUDE.md: "modullar EventEmitter/
 * BullMQ orqali tarqaladi — bir-biriga to'g'ridan-to'g'ri bog'lanmaydi").
 * Emitter modul o'z ishini bajarib bo'lgach (masalan `orders.service.js`
 * zakaz yaratgach) hodisa chiqaradi; tinglovchilar (masalan `notifications`
 * moduli) o'z kompozitsiya vaqtida obuna bo'ladi — ikkalasi bir-birini
 * import qilmaydi.
 *
 * Hodisalar (MVP): `order.new` — `{ companyId, orderId, orderNumber, salePointId }`.
 */
export const domainEvents = new EventEmitter();
