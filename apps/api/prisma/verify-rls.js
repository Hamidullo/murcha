/**
 * RLS izolyatsiyasini HAQIQIY Postgres'da tekshiradi (Faza 13 Task 3).
 *
 * Nima uchun kerak: unit testlar repository'larni mock qiladi — rol huquqi,
 * `FORCE ROW LEVEL SECURITY`, `USING`/`WITH CHECK` xatti-harakatini mock
 * qilib bo'lmaydi. Ya'ni 990 test yashil bo'lsa ham RLS ishlashini
 * ISBOTLAMAYDI. Bu skript aynan shuni tekshiradi.
 *
 * Ishga tushirish (migratsiya + db:rls + db:roles bajarilgach):
 *   pnpm db:verify-rls
 *
 * Ikki ulanish ishlatiladi:
 *   admin (DATABASE_ADMIN_URL, superuser) — sinov ma'lumotini qo'yadi/tozalaydi
 *   app   (DATABASE_URL, murcha_app)      — tekshiruvlar shu rol nomidan
 *
 * CI'da ham ishlatsa bo'ladi (chiqish kodi: 0 — hammasi o'tdi, 1 — yiqildi).
 */
import { PrismaClient } from "@prisma/client";
import { uuidv7 } from "uuidv7";

const adminUrl = process.env.DATABASE_ADMIN_URL;
const appUrl = process.env.DATABASE_URL;

if (!adminUrl) throw new Error("DATABASE_ADMIN_URL kerak");
if (!appUrl) throw new Error("DATABASE_URL kerak");
if (adminUrl === appUrl) {
  throw new Error(
    "DATABASE_URL va DATABASE_ADMIN_URL bir xil — bu holatda RLS tekshirib bo'lmaydi. " +
      "DATABASE_URL `murcha_app` (NOBYPASSRLS) roliga ko'rsatishi kerak (.env.example).",
  );
}

const admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });
const app = new PrismaClient({ datasources: { db: { url: appUrl } } });

const results = [];

/**
 * @param {string} name
 * @param {() => Promise<void>} fn
 */
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  OK    ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`  YIQILDI ${name}\n          ${error.message}`);
  }
}

/**
 * @param {boolean} condition
 * @param {string} message
 */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * `app` ulanishida kontekst o'rnatib callback bajaradi (tenant-context.js
 * bilan bir xil naqsh: `set_config(..., true)` — tranzaksiya doirasida).
 * @template T
 * @param {{ companyId?: string, userId?: string }} context
 * @param {(tx: import("@prisma/client").Prisma.TransactionClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
function asApp(context, callback) {
  return app.$transaction(async (tx) => {
    if (context.companyId) {
      await tx.$executeRaw`SELECT set_config('app.company_id', ${context.companyId}, true)`;
    }
    if (context.userId) {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${context.userId}, true)`;
    }
    return callback(tx);
  });
}

const companyA = uuidv7();
const companyB = uuidv7();
const userA = uuidv7();
const roleA = uuidv7();
const marker = `rls-verify-${Date.now()}`;

async function seedFixtures() {
  await admin.company.createMany({
    data: [
      { id: companyA, name: `${marker}-A`, updatedAt: new Date() },
      { id: companyB, name: `${marker}-B`, updatedAt: new Date() },
    ],
  });
  await admin.user.create({
    data: {
      id: userA,
      phone: `+99890${String(Date.now()).slice(-7)}`,
      passwordHash: "x",
      fullName: marker,
      updatedAt: new Date(),
    },
  });
  await admin.role.create({
    data: { id: roleA, companyId: companyA, name: `${marker}-role`, updatedAt: new Date() },
  });
  await admin.companyMember.create({
    data: {
      id: uuidv7(),
      companyId: companyA,
      userId: userA,
      roleId: roleA,
      updatedAt: new Date(),
    },
  });
}

async function cleanup() {
  await admin.companyMember.deleteMany({ where: { companyId: { in: [companyA, companyB] } } });
  await admin.role.deleteMany({ where: { companyId: { in: [companyA, companyB] } } });
  await admin.user.deleteMany({ where: { id: userA } });
  await admin.company.deleteMany({ where: { id: { in: [companyA, companyB] } } });
}

console.log("\nRLS tekshiruvi (murcha_app roli nomidan):\n");

try {
  await seedFixtures();

  // 0. Rolning o'zi — asosiy shart. Bu yiqilsa qolgani ma'nosiz.
  await check("murcha_app roli superuser EMAS va BYPASSRLS'siz", async () => {
    const [row] = await app.$queryRaw`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user
    `;
    assert(row.rolsuper === false, "rol superuser — RLS hech qachon qo'llanmaydi");
    assert(row.rolbypassrls === false, "rol BYPASSRLS bilan — RLS chetlab o'tiladi");
  });

  await check("murcha_app jadval egasi EMAS (companies)", async () => {
    const [row] = await app.$queryRaw`
      SELECT tableowner = current_user AS is_owner FROM pg_tables WHERE tablename = 'companies'
    `;
    assert(row.is_owner === false, "rol jadval egasi — FORCE'siz RLS chetlab o'tilardi");
  });

  // 1. Kontekstsiz — hech narsa ko'rinmasligi kerak.
  await check("kontekstsiz SELECT companies → 0 qator", async () => {
    const rows = await asApp({}, (tx) =>
      tx.company.findMany({ where: { name: { contains: marker } } }),
    );
    assert(rows.length === 0, `${rows.length} qator qaytdi (0 kutilgan)`);
  });

  // 2. O'z konteksti — faqat o'zi.
  await check("companyA kontekstida faqat companyA ko'rinadi", async () => {
    const rows = await asApp({ companyId: companyA }, (tx) =>
      tx.company.findMany({ where: { name: { contains: marker } } }),
    );
    assert(rows.length === 1, `${rows.length} qator qaytdi (1 kutilgan)`);
    assert(rows[0].id === companyA, "noto'g'ri kompaniya qaytdi");
  });

  // 3. Begona kontekst — qo'shni kompaniya ko'rinmasligi kerak.
  await check("companyB kontekstida companyA ko'rinmaydi", async () => {
    const rows = await asApp({ companyId: companyB }, (tx) =>
      tx.company.findMany({ where: { id: companyA } }),
    );
    assert(rows.length === 0, "begona kompaniya qatori oshkor bo'ldi");
  });

  // 4. ORM filtri UNUTILGAN holat — RLS'ning butun maqsadi shu.
  await check("companyB kontekstida companyA rollari ko'rinmaydi (ORM filtrsiz)", async () => {
    const rows = await asApp({ companyId: companyB }, (tx) =>
      tx.role.findMany({ where: { name: { contains: marker } } }),
    );
    assert(rows.length === 0, `begona rol oshkor bo'ldi (${rows.length} qator)`);
  });

  // 5. company_members — `USING`da user_id filiali bor, `WITH CHECK`da yo'q.
  await check("o'zini begona kompaniyaga a'zo qilib bo'lmaydi (WITH CHECK)", async () => {
    let rejected = false;
    try {
      await asApp({ companyId: companyB, userId: userA }, (tx) =>
        tx.companyMember.create({
          data: {
            id: uuidv7(),
            companyId: companyA, // kontekst companyB — mos kelmaydi
            userId: userA,
            roleId: roleA,
            updatedAt: new Date(),
          },
        }),
      );
    } catch {
      rejected = true;
    }
    assert(rejected, "INSERT o'tib ketdi — huquq eskalatsiyasi ochiq");
  });

  // 6. roles — tenant soxta "tizim" qatori yoza olmasligi kerak.
  await check("company_id = NULL bilan tizim roli yozib bo'lmaydi (WITH CHECK)", async () => {
    let rejected = false;
    try {
      await asApp({ companyId: companyA }, (tx) =>
        tx.role.create({
          data: {
            id: uuidv7(),
            companyId: null,
            name: `${marker}-fake-system`,
            updatedAt: new Date(),
          },
        }),
      );
    } catch {
      rejected = true;
    }
    assert(rejected, "INSERT o'tib ketdi — tenant global rol yarata oladi");
  });

  // 7. Tizim qatorlarini O'QISH esa ishlashi kerak (seed'dagi rollar).
  await check("tizim qatorlari (company_id IS NULL) o'qishga ochiq", async () => {
    const rows = await asApp({ companyId: companyA }, (tx) =>
      tx.role.findMany({ where: { companyId: null, isSystem: true } }),
    );
    assert(rows.length > 0, "tizim rollari ko'rinmadi — seed bajarilganini tekshiring");
  });

  // 8. Login oqimi: kontekstsiz ham o'z a'zoligini ko'rish (USING filiali).
  await check("withUserContext: kompaniyasiz ham o'z a'zoligi ko'rinadi", async () => {
    const rows = await asApp({ userId: userA }, (tx) =>
      tx.companyMember.findMany({ where: { userId: userA } }),
    );
    assert(rows.length === 1, `${rows.length} qator (1 kutilgan) — login oqimi buziladi`);
  });
} finally {
  await cleanup();
  await admin.$disconnect();
  await app.$disconnect();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} tekshiruv o'tdi\n`);
process.exit(failed.length > 0 ? 1 : 0);
