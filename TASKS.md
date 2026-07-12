# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 2 — Mahsulot katalogi

Prisma sxemasi bu faza uchun kerakli barcha modellarni Faza 0'da o'z ichiga oladi (`Warehouse`, `Category`, `Product`, `Unit`, `ProductUnit`, `ProductBarcode`, `ProductImage`, `PriceType`, `ProductPrice`, `ProductVariant`, `Batch`, `Stock`). Tizim birliklari (`dona`/`kg`/`l`/`m`/`quti`/`blok`) `seed.js`da urug'langan.

- [x] **Task 1 — Skladlar + kategoriyalar**: `warehouses` va `categories` modullari (repository→service→controller→routes+testlar), RBAC (`warehouse.manage`/`products.manage`)
- [x] **Task 2 — Mahsulot asosiy CRUD**: `products` moduli (SKU, nom, kategoriya, asosiy birlik, custom JSONB, status/soft-delete)
- [x] **Task 3 — O'ram-birlik konvertatsiyasi + shtrix-kodlar**: `ProductUnit`, `ProductBarcode` — mahsulot service kengaytiriladi
- [x] **Task 4 — Narx turlari + narx tarixi**: `price-types` + `product-prices` modullari (immutable — UPDATE yo'q, yangi qator)
- [x] **Task 5 — Mahsulot variantlari**: `product-variants` moduli (`attributes` JSONB)
- [x] **Task 6 — Rasm yuklash**: MinIO klient (`lib/minio.js`), yuklash endpoint, BullMQ worker (`sharp` bilan thumbnail)
- [x] **Task 7 — Frontend skelet + auth ekranlari**: `apps/web` (Vue 3.5 + Vite + Tailwind 4 + shadcn-vue + Pinia + TanStack Query + Vue Router), login → kompaniya tanlash → himoyalangan dashboard
- [x] **Task 8 — Katalog UI: ro'yxat + qidiruv/filter** (full-text, `pg_trgm` GIN indeks)
- [x] **Task 9 — Katalog UI: mahsulot forma** (yaratish/tahrirlash, rasm/narx/variant boshqaruvi)

Faza 2 "Natija" mezoni (CHECKLIST.md): 100 ta mahsulotli katalog rasmlari bilan telefonda tez ochiladi.
