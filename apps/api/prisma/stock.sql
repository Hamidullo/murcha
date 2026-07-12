-- MURCHA — `stock.unique(warehouse_id, product_id, variant_id, batch_id)`ni
-- NULLS NOT DISTINCT qiladi. Postgres standart bo'yicha NULL ustunlarni "teng
-- emas" deb hisoblaydi, ya'ni variant/partiya yuritilmaydigan mahsulotlarda
-- (variant_id = NULL, batch_id = NULL) bir xil (warehouse_id, product_id)
-- uchun bir nechta qator yaratishga ruxsat berardi. `warehouse-docs`
-- tasdiqlash oqimi (`StockRepository.applyDelta`) Prisma `upsert()` orqali
-- shu unique constraint'ga (`INSERT ... ON CONFLICT`) tayanadi — NULLS NOT
-- DISTINCT bo'lmasa har tasdiqlashda yangi qator yaratilib, qoldiq noto'g'ri
-- hisoblanardi. Postgres 17'da qo'llab-quvvatlanadi (15+). Birinchi
-- migratsiya generatsiya qilingach migration.sql'ga checks.sql bilan birga
-- qo'lda qo'shiladi (`prisma/README.md`).
ALTER TABLE stock DROP CONSTRAINT stock_warehouse_id_product_id_variant_id_batch_id_key;
ALTER TABLE stock ADD CONSTRAINT stock_warehouse_id_product_id_variant_id_batch_id_key
  UNIQUE NULLS NOT DISTINCT (warehouse_id, product_id, variant_id, batch_id);
