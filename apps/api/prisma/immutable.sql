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
