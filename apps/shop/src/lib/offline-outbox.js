import { ref } from "vue";
import { openDB } from "idb";
import { ApiError } from "../api/client.js";

const DB_NAME = "murcha-shop-outbox";
const STORE = "orders";

/** @returns {Promise<import("idb").IDBPDatabase>} */
function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: "idempotencyKey" });
    },
  });
}

/** Navbatdagi (hali yuborilmagan) zakazlar soni — reaktiv, UI'da ko'rsatish uchun. */
export const queuedCount = ref(0);

/** @returns {Promise<void>} */
async function refreshCount() {
  const db = await getDb();
  queuedCount.value = await db.count(STORE);
}
refreshCount();

/**
 * Internet yo'qligida (yoki so'rov tarmoq xatosi bilan tugaganda) zakazni
 * IndexedDB navbatiga qo'yadi — `idempotencyKey` allaqachon DTO'da bor,
 * keyinchalik qayta yuborilganda backend duplikatni bloklaydi.
 * @param {import("@murcha/shared").CreateOrderDto} dto
 * @returns {Promise<void>}
 */
export async function enqueueOrder(dto) {
  const db = await getDb();
  await db.put(STORE, { ...dto, queuedAt: Date.now() });
  await refreshCount();
}

/**
 * Navbatdagi barcha zakazlarni yuborishga urinadi. Server aniq rad etsa
 * (4xx — masalan qoldiq yetmasa yoki DTO noto'g'ri) yozuv navbatdan
 * o'chiriladi, cheksiz qayta urinish oldini olish uchun. Tarmoq xatosida
 * (offline, `fetch` reject) yoki serverning o'zi mavjud emasligida
 * (5xx — proxy/nginx "upstream unavailable" javobi ham shu holatga
 * kiradi, real productionda API vaqtincha o'chib qolishi mumkin) yozuv
 * navbatda qoladi, keyingi flush'da qayta urinadi.
 * @param {(dto: import("@murcha/shared").CreateOrderDto) => Promise<unknown>} createOrderFn
 * @returns {Promise<void>}
 */
export async function flushOutbox(createOrderFn) {
  const db = await getDb();
  const items = await db.getAll(STORE);
  for (const dto of items) {
    try {
      await createOrderFn(dto);
      await db.delete(STORE, dto.idempotencyKey);
    } catch (err) {
      const isPermanentRejection = err instanceof ApiError && err.status >= 400 && err.status < 500;
      if (isPermanentRejection) {
        await db.delete(STORE, dto.idempotencyKey);
      }
    }
  }
  await refreshCount();
}
