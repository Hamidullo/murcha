-- MURCHA — DB rollarini ajratish (DATABASE.md 9-bo'lim, Faza 13).
--
-- Nima uchun: Postgres'da jadval EGASI va superuser RLS policy'larni chetlab
-- o'tadi. `docker-compose.yml`dagi `POSTGRES_USER` (masalan `murcha`) —
-- superuser va barcha jadvallarning egasi. API o'sha rol bilan ulanganida
-- `rls.sql`dagi policy'lar hech qachon qo'llanmasdi — ya'ni RLS bor'day
-- ko'rinib, aslida ishlamasdi. Shu fayl API uchun alohida cheklangan rol
-- yaratadi.
--
-- Rollar taqsimoti:
--   murcha      (owner, superuser)  — migratsiya + `prismaBypass` client
--                                     (platform moduli, showcase slug qidiruvi)
--   murcha_app  (LOGIN, NOBYPASSRLS, ega EMAS) — API'ning barcha oddiy so'rovlari
--
-- Ishga tushirish: `node prisma/setup-roles.js` (`pnpm db:roles`) — u
-- `murcha.role_name`/`murcha.role_password` GUC'larini parametr sifatida
-- o'rnatadi, quyidagi blok esa `format('%I'/'%L')` bilan xavfsiz qo'yadi.
-- Migratsiyadan KEYIN ishlatilishi kerak (GRANT mavjud jadvallarga beriladi).
--
-- Idempotent — har deploy'da qayta ishlatilaveradi.

DO $$
DECLARE
  r text := current_setting('murcha.role_name');
  p text := current_setting('murcha.role_password');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
    EXECUTE format('CREATE ROLE %I LOGIN', r);
  END IF;

  -- NOBYPASSRLS — asosiy nuqta: bu rol RLS'ni chetlab o'tolmaydi.
  EXECUTE format('ALTER ROLE %I LOGIN NOBYPASSRLS PASSWORD %L', r, p);

  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), r);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', r);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', r);
  EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', r);

  -- Kelajakdagi migratsiyalar yangi jadval qo'shsa, GRANT'ni qayta yozish
  -- kerak bo'lmasin (owner yaratgan obyektlarga avtomatik qo'llanadi).
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', r
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', r
  );

  -- DDL bermaymiz: `murcha_app` jadval yarata/o'zgartira olmaydi (migratsiya
  -- owner roli ishi). Ega bo'lmagani uchun RLS'ni ham o'chira olmaydi.
END $$;
