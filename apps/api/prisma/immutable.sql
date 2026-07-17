-- =========================================================================
-- DIQQAT — BU FAYL QO'LLANMAYDI (Faza 13, /code-review topilmasi).
--
-- Mazmuni `migrations/20260717090000_init/migration.sql` oxiriga NUSXALANGAN
-- va HAQIQATDA O'SHA NUSXA bajariladi. Bu fayl faqat tarixiy hujjat —
-- birinchi migratsiya qanday yig'ilganini ko'rsatadi.
--
-- Shu faylni tahrirlash HECH NARSAGA TA'SIR QILMAYDI (jim no-op).
-- Yangi qoida kerak bo'lsa — YANGI migratsiya fayli yozing.
-- (`rls.sql`/`search.sql` esa boshqacha: ular har deploy'da qo'llanadi.)
-- =========================================================================

-- MURCHA — immutable jurnallar: INSERT only, UPDATE/DELETE DB darajasida
-- taqiqlanadi (DATABASE.md 0-bo'lim). Birinchi migratsiyadan keyin qo'llaniladi
-- (checks.sql/rls.sql qatorida, `prisma/README.md`da tartib yozilgan).

CREATE OR REPLACE FUNCTION forbid_update_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% jadvali immutable — UPDATE/DELETE taqiqlangan', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'stock_movements', 'debt_movements', 'audit_logs', 'order_status_history', 'transactions'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_no_update_delete BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION forbid_update_delete()',
      t, t
    );
  END LOOP;
END $$;
