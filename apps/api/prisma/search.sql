-- MURCHA — full-text qidiruv uchun trigram indeks (DATABASE.md, Faza 2 Task 8).
-- Postgres pg_trgm kengaytmasi GIN indeks orqali `ILIKE '%so'z%'` so'rovlarini
-- tezlashtiradi — Prisma `contains` + `mode: "insensitive"` aynan shu
-- operatorga compile bo'ladi (products.repository.js `list()`).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_uz_trgm
  ON products USING GIN (name_uz gin_trgm_ops);
