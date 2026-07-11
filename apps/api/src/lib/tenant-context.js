import { prisma } from "./prisma.js";

/**
 * Har tenant so'rovi shu wrapper orqali o'tadi: Prisma tranzaksiyasi
 * `set_config('app.company_id', ...)` bilan boshlanadi, so'ng RLS policy
 * (`prisma/rls.sql`) shu sozlamaga qarab qatorlarni filtrlaydi. ORM qatlamida
 * `company_id` filtri unutilsa ham, DB darajasida boshqa kompaniya ma'lumoti
 * qaytmaydi (DATABASE.md 9-bo'lim, ikkinchi himoya qavati).
 *
 * Service qatlami repository chaqiruvlarini shu funksiya ichida qiladi —
 * repository'ga oddiy Prisma client emas, shu yerdan kelgan `tx` beriladi.
 * @template T
 * @param {string} companyId
 * @param {(tx: import("@prisma/client").Prisma.TransactionClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withTenant(companyId, callback) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.company_id', ${companyId}, true)`;
    return callback(tx);
  });
}
