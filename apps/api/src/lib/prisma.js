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

/** @returns {PrismaClient} */
function createBypassClient() {
  const adminUrl = process.env.DATABASE_ADMIN_URL;

  if (adminUrl) {
    return new PrismaClient({ datasources: { db: { url: adminUrl } } });
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
