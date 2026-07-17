import { prisma, prismaBypass } from "./prisma.js";

/**
 * Har tenant so'rovi shu wrapper orqali o'tadi: Prisma tranzaksiyasi
 * `set_config('app.company_id', ...)` bilan boshlanadi, so'ng RLS policy
 * (`prisma/rls.sql`) shu sozlamaga qarab qatorlarni filtrlaydi. ORM qatlamida
 * `company_id` filtri unutilsa ham, DB darajasida boshqa kompaniya ma'lumoti
 * qaytmaydi (DATABASE.md 9-bo'lim, ikkinchi himoya qavati).
 *
 * `userId` berilsa `app.user_id` ham set qilinadi — `company_members` kabi
 * o'z-egalik istisnosiga ega jadvallar uchun kerak (masalan audit/`created_by`
 * tekshiruvlari). Ixtiyoriy: ko'p tenant operatsiyasida kerak emas.
 *
 * Service qatlami repository chaqiruvlarini shu funksiya ichida qiladi —
 * repository'ga oddiy Prisma client emas, shu yerdan kelgan `tx` beriladi.
 * @template T
 * @param {string} companyId
 * @param {string | null} userId
 * @param {(tx: import("@prisma/client").Prisma.TransactionClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withTenant(companyId, userId, callback) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.company_id', ${companyId}, true)`;
    if (userId) {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    }
    return callback(tx);
  });
}

/**
 * Faqat `app.user_id` kontekstida ishlaydi — company hali tanlanmagan
 * holatlar uchun (masalan login: "bu user qaysi kompaniyaga a'zo" so'rovi,
 * `company_members` RLS istisnosiga tayanadi — `prisma/rls.sql`).
 * @template T
 * @param {string} userId
 * @param {(tx: import("@prisma/client").Prisma.TransactionClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withUserContext(userId, callback) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return callback(tx);
  });
}

/**
 * Hech qanday tenant/user kontekst o'rnatmaydi — faqat chinakam global
 * (RLS'siz) jadvallar uchun: `users`, `permissions`, `push_subscriptions`
 * (DATABASE.md 9-bo'lim istisnolari). Masalan login boshida telefon bo'yicha
 * user qidirish — userId hali noma'lum, `withUserContext` chaqirib bo'lmaydi.
 *
 * DIQQAT: oddiy (`murcha_app`, NOBYPASSRLS) client'da ishlaydi — RLS'li
 * jadvalga bu yerdan murojaat qilinsa NOL qator qaytadi, xato emas. Ya'ni bu
 * "RLS'ni chetlab o'tish" DEGANI EMAS; cross-tenant o'qish uchun
 * `withBypass()` ishlatiladi.
 * @template T
 * @param {(tx: import("@prisma/client").Prisma.TransactionClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withoutTenant(callback) {
  return prisma.$transaction(callback);
}

/**
 * RLS'ni CHETLAB O'TADI (owner roli, `DATABASE_ADMIN_URL` — `lib/prisma.js`).
 * Faqat chinakam cross-tenant yo'llar uchun, ya'ni `app.company_id` tanlash
 * mumkin bo'lmagan joyda:
 *   - `platform` moduli — super-admin barcha kompaniyalarni ko'radi
 *   - `showcase` — slug bo'yicha kompaniya qidirish (qaysi kompaniya ekani
 *     aynan shu so'rov natijasida ma'lum bo'ladi)
 *
 * Yangi joyda ishlatishdan oldin o'ylang: kompaniya ID'si ma'lum bo'lsa
 * `withTenant()` to'g'ri tanlov. Bu funksiya himoya qatlamini o'chiradi —
 * so'rov qamrovini iloji boricha tor tuting (showcase namunasi: faqat slug
 * qidiruvi bypass, katalog esa topilgan kompaniya kontekstida).
 * @template T
 * @param {(tx: import("@prisma/client").Prisma.TransactionClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withBypass(callback) {
  return prismaBypass.$transaction(callback);
}
