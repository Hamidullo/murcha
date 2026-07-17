import { URL } from "node:url";
import { PrismaClient } from "@prisma/client";

/**
 * Oddiy (tenant) client — `DATABASE_URL` orqali `murcha_app` roli bilan
 * ulanadi: LOGIN, NOBYPASSRLS, jadval egasi emas. Ya'ni `prisma/rls.sql`
 * policy'lari SHU client uchun haqiqatan qo'llanadi. API'ning deyarli barcha
 * so'rovlari shu yerdan o'tadi (`lib/tenant-context.js`).
 */
export const prisma = new PrismaClient();

/**
 * RLS'ni chetlab o'tadigan client — `DATABASE_ADMIN_URL` orqali owner roli
 * bilan ulanadi. FAQAT chinakam cross-tenant yo'llar uchun (`withBypass()`,
 * `lib/tenant-context.js`): super-admin paneli va vitrinaning slug qidiruvi.
 *
 * Prod'da `DATABASE_ADMIN_URL` majburiy: jim `DATABASE_URL`ga qaytish butun
 * RLS himoyasini bekor qilardi (owner roli policy'larni chetlab o'tadi), shu
 * sababli yo'q bo'lsa ilova ishga tushmaydi. Dev/testda esa bitta URL bilan
 * ishlash qulay — u yerda ogohlantirish bilan `DATABASE_URL`ga qaytadi.
 */
export const prismaBypass = createBypassClient();

/**
 * Bypass client kamdan-kam ishlatiladi (super-admin paneli, vitrina slug
 * qidiruvi), lekin Prisma standart pool'i `num_cpus * 2 + 1` ta ulanish
 * oladi. Cheklamasak 8 yadroli serverda har jarayon (api + worker) ikki
 * baravar ulanish egallardi va Postgres'ning standart `max_connections=100`
 * chegarasiga behuda yaqinlashardi.
 */
const BYPASS_CONNECTION_LIMIT = 2;

/** @returns {PrismaClient} */
function createBypassClient() {
  const adminUrl = process.env.DATABASE_ADMIN_URL;

  if (adminUrl) {
    return new PrismaClient({ datasources: { db: { url: withConnectionLimit(adminUrl) } } });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_ADMIN_URL sozlanmagan. Prod'da u majburiy: `DATABASE_URL`ga " +
        "qaytish super-admin/vitrina yo'llarini owner roli bilan emas, API roli " +
        "bilan ishlatib, cross-tenant so'rovlarni buzadi; teskarisi — ikkalasi " +
        "owner bo'lsa RLS umuman qo'llanmaydi (prisma/rls.sql).",
    );
  }

  console.warn(
    "[prisma] DATABASE_ADMIN_URL yo'q — bypass client DATABASE_URL'ga qaytdi. " +
      "Faqat dev/test uchun: bu holatda RLS izolyatsiyasi tekshirilmaydi.",
  );
  return prisma;
}

/**
 * URL'ga `connection_limit` qo'shadi, mavjud query parametrlarini
 * (`?schema=public`) buzmasdan. Foydalanuvchi o'zi belgilagan bo'lsa tegilmaydi.
 * @param {string} url
 * @returns {string}
 */
function withConnectionLimit(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", String(BYPASS_CONNECTION_LIMIT));
    }
    return parsed.toString();
  } catch {
    // URL parse qilinmasa (masalan socket yo'li) — o'zgartirmasdan qaytaramiz,
    // ulanishni buzgandan ko'ra ortiqcha pool afzal.
    return url;
  }
}
