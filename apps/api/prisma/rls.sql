-- MURCHA — Row-Level Security policies (DATABASE.md 9-bo'lim).
--
-- Migratsiya qo'llanilgach ishga tushiriladi:
--   pnpm db:rls
--
-- Idempotent: har `CREATE POLICY` oldidan `DROP POLICY IF EXISTS` bajariladi,
-- shuning uchun prod'dagi `migrate` xizmati (docker-compose.prod.yml) har
-- deploy'da qayta ishga tushirsa ham xato bermaydi.
--
-- Pattern: har so'rov Prisma `$transaction` ichida
--   SELECT set_config('app.company_id', $companyId, true)
-- bilan boshlanadi (`lib/tenant-context.js`). RLS — ikkinchi himoya qavati:
-- ORM'da xato bo'lsa ham baza boshqa kompaniya ma'lumotini qaytarmaydi.
--
-- NULLIF(...) NEGA KERAK (Faza 13 Task 3, haqiqiy DB sinovida topilgan):
-- `set_config(..., true)` tranzaksiya-lokal, lekin GUC bir marta tegilgach
-- sessiyada "mavjud" bo'lib qoladi va tranzaksiya tugagach qiymati NULL'ga
-- EMAS, BO'SH SATRGA qaytadi. Ya'ni keyingi so'rovda
-- `current_setting('app.company_id', true)` `''` beradi, `''::uuid` esa
-- `22P02 invalid input syntax for type uuid` bilan yiqiladi.
-- Prisma ulanishlarni pool qilgani uchun bu prod'da shunday urardi: tenant
-- so'rovi ulanishni "iflos" qiladi → o'sha ulanishda keyingi login
-- (`withUserContext`, faqat app.user_id) yiqiladi. NULLIF bo'sh satrni
-- NULL'ga aylantiradi; `company_id = NULL` → NULL → qator ko'rinmaydi
-- (kontekstsiz hech nima ko'rinmasligi — aynan kerakli xatti-harakat).
--
-- MUHIM (Faza 13): policy'lar faqat RLS'ni chetlab o'tolmaydigan rol uchun
-- ma'noga ega. Jadval EGASI va superuser RLS'ni e'tiborsiz qoldiradi,
-- shuning uchun ikki chora birga ishlatiladi:
--   1. API alohida `murcha_app` roli bilan ulanadi — LOGIN, NOBYPASSRLS,
--      ega EMAS (`prisma/roles.sql`, `pnpm db:roles`).
--   2. Har jadvalga FORCE ROW LEVEL SECURITY — ega ham chetlab o'tolmaydi.
-- Faqat `DATABASE_ADMIN_URL` (owner) client'i chetlab o'tadi: migratsiya va
-- `withBypass()` (platform moduli, showcase slug qidiruvi) — `lib/prisma.js`.
--
-- WITH CHECK (yozish) `USING` (o'qish)dan ATAYIN farq qiladi: `USING`da
-- ruxsat etilgan kengroq ko'rinish yozishga o'tib ketmasligi kerak.
-- Postgres `WITH CHECK` yozilmasa `USING` ifodasini yozish uchun ham
-- ishlatadi — shu sababli kengroq `USING`li jadvallarda u aniq yoziladi.
--
-- Istisnolar (RLS'siz, DATABASE.md 9-bo'lim): users, permissions — global.
--
-- Eslatma: company_id ustuni bo'lmagan bola-jadvallar (order_items,
-- warehouse_doc_items, payment_allocations...) RLS'ga ega emas — ular doim
-- ota-jadval (orders, warehouse_docs...) bilan JOIN orqali so'raladi, ota-jadval
-- RLS bilan izolyatsiya qiladi. To'g'ridan-to'g'ri bola-jadvalga so'rov
-- yozmaslik — repository qatlami qoidasi (CLAUDE.md).

-- --- company_id NOT NULL jadvallar ---
-- USING = WITH CHECK: faqat o'z kompaniya qatorlari (o'qish ham, yozish ham).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_logs', 'warehouses', 'counterparties', 'sale_points',
    'categories', 'products', 'price_types', 'product_barcodes', 'batches', 'stock',
    'warehouse_docs', 'stock_movements', 'purchase_orders', 'inventory_counts',
    'doc_counters', 'orders', 'deliveries', 'courier_locations', 'leads',
    'cash_registers', 'expense_categories', 'transactions', 'debt_movements',
    'payments', 'notifications', 'subscriptions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (company_id = NULLIF(current_setting(''app.company_id'', true), '''')::uuid)',
      t
    );
  END LOOP;
END $$;

-- --- company_members — istisno: foydalanuvchi o'z a'zolik qatorlarini HAR
-- DOIM ko'radi, company kontekst tanlanmagan bo'lsa ham (Faza 1 auth
-- kashfiyoti: login paytida "bu user qaysi kompaniyaga a'zo" so'rovi hali
-- app.company_id yo'q holatda ishlaydi — withUserContext() shu uchun).
--
-- WITH CHECK esa `user_id` filialisiz — aks holda foydalanuvchi o'zini
-- ISTALGAN kompaniyaga a'zo qilib qo'sha olardi (huquq eskalatsiyasi).
-- Yozish faqat joriy kompaniya kontekstida: registerCompany()/taklif oqimi
-- ikkalasi ham `withTenant(companyId, ...)` ichida ishlaydi. ---
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON company_members;
CREATE POLICY tenant_isolation ON company_members
  USING (
    company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  )
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

-- --- company_id NULL bo'lishi mumkin bo'lgan jadvallar (tizim qatorlari + tenant) ---
-- O'qish: tizim qatorlari (company_id IS NULL) + o'z qatorlari.
-- Yozish: FAQAT o'z qatorlari — aks holda tenant `company_id = NULL` bilan
-- BARCHA kompaniyalarga ko'rinadigan "tizim" birligi/kursi yarata olardi.
-- Tizim qatorlari `prisma/seed.js` orqali owner roli bilan qo'yiladi (RLS'dan
-- tashqarida), shuning uchun bu cheklov seed'ga xalaqit bermaydi. ---
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['units', 'exchange_rates']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (company_id IS NULL OR company_id = NULLIF(current_setting(''app.company_id'', true), '''')::uuid) '
      'WITH CHECK (company_id = NULLIF(current_setting(''app.company_id'', true), '''')::uuid)',
      t
    );
  END LOOP;
END $$;

-- --- LOGIN OQIMI ISTISNOSI (Faza 13 Task 3, haqiqiy DB sinovida topilgan) ---
--
-- `company_members` uchun "o'z a'zoligini har doim ko'radi" istisnosi bor edi,
-- lekin login so'rovi (`company-members.repository.js findByUserId()`) a'zolik
-- qatorini YOLG'IZ o'qimaydi — `include: { company: true, role: true }` bilan
-- o'qiydi. `app.company_id` esa login paytida hali yo'q, shuning uchun bog'liq
-- `companies`/`roles` qatorlari policy'dan o'tmay `null` qaytardi va Prisma
-- "Inconsistent query result: Field company is required to return data, got
-- null" bilan yiqilardi — ya'ni RLS yoqilganda LOGIN UMUMAN ISHLAMASDI.
--
-- Yechim: ikkala jadvalga ham `company_members` bilan bir xil mantiqdagi
-- a'zolik filiali. Kengaytma tor: foydalanuvchi faqat O'ZI FAOL A'ZO bo'lgan
-- kompaniya/rol qatorini ko'radi. `WITH CHECK` esa filialsiz qoladi — yozish
-- doim `withTenant(companyId, ...)` kontekstida bo'ladi.
--
-- Rekursiya yo'q: `company_members` policy'si `companies`/`roles`ga murojaat
-- qilmaydi. Tezlik: `company_members(user_id)` indeksi mavjud (schema.prisma).

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON companies;
CREATE POLICY tenant_isolation ON companies
  USING (
    id = NULLIF(current_setting('app.company_id', true), '')::uuid
    OR EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = companies.id
        AND m.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND m.status = 'active'
    )
  )
  WITH CHECK (id = NULLIF(current_setting('app.company_id', true), '')::uuid);

-- `roles`: tizim rollari (company_id IS NULL) + joriy kompaniya rollari +
-- a'zo bo'lgan kompaniya rollari (login `include: { role: true }` uchun —
-- tizim roli bo'lmagan MAXSUS rolli foydalanuvchida aynan shu filial kerak).
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON roles;
CREATE POLICY tenant_isolation ON roles
  USING (
    company_id IS NULL
    OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    OR EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = roles.company_id
        AND m.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND m.status = 'active'
    )
  )
  WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
