-- MURCHA — Row-Level Security policies (DATABASE.md 9-bo'lim).
--
-- Birinchi migratsiya qo'llanilgach (`pnpm db:migrate`) ishga tushiriladi:
--   pnpm db:rls
--
-- Pattern: har so'rov Prisma `$transaction` ichida
--   SELECT set_config('app.company_id', $companyId, true)
-- bilan boshlanadi (Faza 0 Task 4'da yoziladigan wrapper). RLS — ikkinchi
-- himoya qavati: ORM'da xato bo'lsa ham baza boshqa kompaniya ma'lumotini
-- qaytarmaydi.
--
-- Istisnolar (RLS'siz, DATABASE.md 9-bo'lim): users, permissions — global.
-- company_id NULL bo'lishi mumkin bo'lgan jadvallar (tizim rollari/birliklari/
-- kurslari): NULL qator + o'z kompaniya qatorlari ko'rinadi.
--
-- Eslatma: company_id ustuni bo'lmagan bola-jadvallar (order_items,
-- warehouse_doc_items, payment_allocations...) RLS'ga ega emas — ular doim
-- ota-jadval (orders, warehouse_docs...) bilan JOIN orqali so'raladi, ota-jadval
-- RLS bilan izolyatsiya qiladi. To'g'ridan-to'g'ri bola-jadvalga so'rov
-- yozmaslik — repository qatlami qoidasi (CLAUDE.md).

-- --- company_id NOT NULL jadvallar ---
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'company_members', 'audit_logs', 'warehouses', 'counterparties', 'sale_points',
    'categories', 'products', 'price_types', 'product_barcodes', 'batches', 'stock',
    'warehouse_docs', 'stock_movements', 'purchase_orders', 'inventory_counts',
    'doc_counters', 'orders', 'deliveries', 'courier_locations', 'leads',
    'cash_registers', 'expense_categories', 'transactions', 'debt_movements',
    'payments', 'notifications', 'subscriptions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (company_id = current_setting(''app.company_id'', true)::uuid)',
      t
    );
  END LOOP;
END $$;

-- --- company_id NULL bo'lishi mumkin bo'lgan jadvallar (tizim qatorlari + tenant) ---
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['roles', 'units', 'exchange_rates']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (company_id IS NULL OR company_id = current_setting(''app.company_id'', true)::uuid)',
      t
    );
  END LOOP;
END $$;

-- --- companies — faqat o'z qatori ko'rinadi ---
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON companies
  USING (id = current_setting('app.company_id', true)::uuid);

-- Super-admin panel (Faza 11) uchun RLS bypass — alohida DB roli orqali
-- (`NOBYPASSRLS` API rolidan ajratilgan migratsiya/admin roli), MVP'da keyinroq.
