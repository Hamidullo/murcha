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
      'CREATE POLICY tenant_isolation ON %I USING (company_id = current_setting(''app.company_id'', true)::uuid)',
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
    company_id = current_setting('app.company_id', true)::uuid
    OR user_id = current_setting('app.user_id', true)::uuid
  )
  WITH CHECK (company_id = current_setting('app.company_id', true)::uuid);

-- --- company_id NULL bo'lishi mumkin bo'lgan jadvallar (tizim qatorlari + tenant) ---
-- O'qish: tizim qatorlari (company_id IS NULL) + o'z qatorlari.
-- Yozish: FAQAT o'z qatorlari — aks holda tenant `company_id = NULL` bilan
-- BARCHA kompaniyalarga ko'rinadigan "tizim" roli/birligi/kursi yarata olardi.
-- Tizim qatorlari `prisma/seed.js` orqali owner roli bilan qo'yiladi (RLS'dan
-- tashqarida), shuning uchun bu cheklov seed'ga xalaqit bermaydi. ---
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['roles', 'units', 'exchange_rates']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (company_id IS NULL OR company_id = current_setting(''app.company_id'', true)::uuid) '
      'WITH CHECK (company_id = current_setting(''app.company_id'', true)::uuid)',
      t
    );
  END LOOP;
END $$;

-- --- companies — faqat o'z qatori ko'rinadi. registerCompany() yangi
-- kompaniya ID'sini oldindan generatsiya qilib `withTenant(newCompanyId, ...)`
-- ochadi, shuning uchun INSERT ham shu policy'dan o'tadi. ---
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON companies;
CREATE POLICY tenant_isolation ON companies
  USING (id = current_setting('app.company_id', true)::uuid);
