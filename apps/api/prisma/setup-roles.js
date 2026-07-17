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
  await assertAdminCanBypassRls();

  // Bitta tranzaksiya — `set_config` va DO bloki AYNI ulanishda bajarilishi
  // shart (Prisma pool aks holda boshqa ulanish berishi mumkin).
  await prisma.$transaction(async (tx) => {
    // `is_local = true` — qiymat faqat shu tranzaksiyada yashaydi. `false`
    // bo'lsa parol commit'dan keyin ham sessiyada qolib, `current_setting()`
    // bilan o'qilishi va `log_statement='all'` bo'lsa logga tushishi mumkin edi.
    await tx.$executeRaw`SELECT set_config('murcha.role_name', ${roleName}, true)`;
    await tx.$executeRaw`SELECT set_config('murcha.role_password', ${password}, true)`;
    await tx.$executeRawUnsafe(sql);
  });
  console.log(`DB roli tayyor: ${roleName} (NOBYPASSRLS)`);
} finally {
  await prisma.$disconnect();
}

/**
 * `DATABASE_ADMIN_URL` roli RLS'ni CHETLAB O'TA OLISHINI tekshiradi.
 *
 * Nima uchun: `rls.sql` har jadvalga `FORCE ROW LEVEL SECURITY` qo'yadi — u
 * jadval EGASIGA ham qo'llanadi. Faqat `rolsuper` yoki `rolbypassrls` roli
 * chetlab o'tadi. Ya'ni admin rol shulardan biri bo'lmasa, `withBypass()`
 * (platform paneli, vitrina slug qidiruvi) JIMGINA nol qator qaytaradi va
 * `seed.js` `company_id = NULL` qatorlarini yozolmaydi. Boshqarilayotgan
 * Postgres'da (RDS/Cloud SQL/Neon) "master" foydalanuvchi odatda superuser
 * EMAS — shuning uchun bu deploy paytida, tushunarli xato bilan to'xtaydi.
 * @returns {Promise<void>}
 */
async function assertAdminCanBypassRls() {
  const [row] = await prisma.$queryRaw`
    SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user
  `;

  if (!row.rolsuper && !row.rolbypassrls) {
    throw new Error(
      `DATABASE_ADMIN_URL roli (${row.rolname}) RLS'ni chetlab o'tolmaydi: ` +
        `rolsuper=false, rolbypassrls=false.\n` +
        `prisma/rls.sql FORCE ROW LEVEL SECURITY ishlatadi — u jadval egasiga ham ` +
        `qo'llanadi, shuning uchun bu rol bilan platform paneli bo'sh qaytadi, ` +
        `vitrina 404 beradi va seed.js yiqiladi.\n` +
        `Yechim: superuser bilan \`ALTER ROLE ${row.rolname} BYPASSRLS;\` bajaring ` +
        `(boshqarilayotgan Postgres'da provayder hujjatiga qarang) yoki ` +
        `DATABASE_ADMIN_URL'ni superuser/BYPASSRLS roliga ko'rsating.`,
    );
  }
}
