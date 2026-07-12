import { redis } from "./redis.js";

const KEY = "murcha:companies:active";

/**
 * `companies` jadvali RLS bilan himoyalangan (`rls.sql`) — global cron
 * kompaniyalar ro'yxatini `app.company_id` konteksti bo'lmasdan o'qiy
 * olmaydi (bypass roli Faza 11'ga qoldirilgan). Shuning uchun har yangi
 * kompaniya ro'yxatdan o'tganda (`auth.service.js registerCompany()`)
 * bu yerga qo'shiladi — kunlik eslatma job'i (`worker.js`) shu ro'yxatni
 * o'qib, har biri uchun alohida `withTenant` ochadi.
 * @param {string} companyId
 * @returns {Promise<void>}
 */
export async function addActiveCompany(companyId) {
  await redis.sadd(KEY, companyId);
}

/**
 * @returns {Promise<string[]>}
 */
export async function listActiveCompanies() {
  return redis.smembers(KEY);
}
