import { ref } from "vue";
import { openDB } from "idb";
import { ApiError } from "../api/client.js";

const DB_NAME = "murcha-web-outbox";
const STORE = "warehouseDocActions";

/** @returns {Promise<import("idb").IDBPDatabase>} */
function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: "id" });
    },
  });
}

/** Navbatdagi (hali yuborilmagan) amallar soni — reaktiv, UI'da ko'rsatish uchun. */
export const queuedCount = ref(0);

/** @returns {Promise<void>} */
async function refreshCount() {
  const db = await getDb();
  queuedCount.value = await db.count(STORE);
}
refreshCount();

/**
 * Tarmoq yo'qligida sklad hujjati amalini (tasdiqlash/bekor qilish)
 * navbatga qo'yadi. `id` = `docId:action` — bir xil amal ikki marta
 * navbatga tushmaydi (masalan foydalanuvchi tugmani ikki marta bossa).
 * Bu amallar tabiatan xavfsiz qayta urinishga ega: `warehouse-docs.service.js`
 * `confirm()`/`cancel()` hujjat holatini tekshiradi (`ConflictError`),
 * shu sababli qayta yuborilsa ham qoldiq ikki marta o'zgarmaydi.
 * @param {string} docId
 * @param {"confirm" | "cancel"} action
 * @returns {Promise<void>}
 */
export async function enqueueWarehouseDocAction(docId, action) {
  const db = await getDb();
  await db.put(STORE, { id: `${docId}:${action}`, docId, action, queuedAt: Date.now() });
  await refreshCount();
}

/**
 * Navbatdagi barcha amallarni yuborishga urinadi. Server aniq rad etsa
 * (4xx — masalan hujjat allaqachon tasdiqlangan) yozuv navbatdan
 * o'chiriladi. Tarmoq xatosida yoki serverning o'zi mavjud emasligida
 * (5xx) yozuv navbatda qoladi, keyingi flush'da qayta urinadi.
 * @param {{ confirm: (docId: string) => Promise<unknown>, cancel: (docId: string) => Promise<unknown> }} handlers
 * @returns {Promise<void>}
 */
export async function flushOutbox(handlers) {
  const db = await getDb();
  const items = await db.getAll(STORE);
  for (const item of items) {
    try {
      await handlers[item.action](item.docId);
      await db.delete(STORE, item.id);
    } catch (err) {
      const isPermanentRejection = err instanceof ApiError && err.status >= 400 && err.status < 500;
      if (isPermanentRejection) {
        await db.delete(STORE, item.id);
      }
    }
  }
  await refreshCount();
}
