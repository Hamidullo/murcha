/**
 * `prisma/roles.sql`ni qo'llaydi — API uchun cheklangan (`NOBYPASSRLS`) DB
 * rolini yaratadi/yangilaydi. Owner (`DATABASE_ADMIN_URL`) roli bilan
 * bajariladi, migratsiyadan KEYIN (GRANT mavjud jadvallarga beriladi).
 *
 * Nima uchun alohida skript, `prisma db execute --file` emas: rol nomi va
 * paroli SQL'ga qotirilmasligi kerak. Ular shu yerda GUC sifatida PARAMETR
 * bilan uzatiladi (`set_config($1, $2)`), `roles.sql` esa `format('%I'/'%L')`
 * bilan quotelaydi — SQL-in'ektsiya yo'li yo'q.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { PrismaClient } from "@prisma/client";

const adminUrl = process.env.DATABASE_ADMIN_URL;
const roleName = process.env.APP_DB_USER ?? "murcha_app";
const password = process.env.APP_DB_PASSWORD;

if (!adminUrl) {
  throw new Error("DATABASE_ADMIN_URL kerak (owner roli — rol yaratish uchun DDL huquqi)");
}
if (!password) {
  throw new Error("APP_DB_PASSWORD kerak (API roli paroli)");
}
// `format('%I')` o'zi ham quotelaydi, lekin nomni oldindan cheklash xatoni
// erta va tushunarli qiladi (DATABASE_URL'dagi rol nomi bilan mos bo'lishi shart).
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(roleName)) {
  throw new Error(`APP_DB_USER noto'g'ri: ${roleName} (kutilgan: ^[a-z_][a-z0-9_]{0,62}$)`);
}

const sqlPath = fileURLToPath(new URL("./roles.sql", import.meta.url));
const sql = await readFile(sqlPath, "utf8");

const prisma = new PrismaClient({ datasources: { db: { url: adminUrl } } });

try {
  // Bitta tranzaksiya — `set_config` va DO bloki AYNI ulanishda bajarilishi
  // shart (Prisma pool aks holda boshqa ulanish berishi mumkin).
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('murcha.role_name', ${roleName}, false)`;
    await tx.$executeRaw`SELECT set_config('murcha.role_password', ${password}, false)`;
    await tx.$executeRawUnsafe(sql);
  });
  console.log(`DB roli tayyor: ${roleName} (NOBYPASSRLS)`);
} finally {
  await prisma.$disconnect();
}
