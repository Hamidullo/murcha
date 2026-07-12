# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 5 — B2B zakaz portali (killer feature)

`SalePoint`/`Order`/`OrderItem`/`OrderStatusHistory`/`UserAssignment` Prisma modellari Faza 0'dan tayyor — sxema o'zgarmaydi. Arxitektura qarorlari (status oqimi kesimi, rezerv/jo'natish mantig'i, do'kon↔nuqta bog'lanishi, narxlash, idempotency) — Task 1 boshida plan-rejimda kelishilgan.

- [x] **Task 1 — Sale points backend**: `sale-points` moduli (CRUD, `warehouses` qolipi) + operator biriktirish (`user-assignments` repository/service) + `seed.js`: `orders.view`/`orders.confirm` → `warehouse_manager`/`picker`
- [x] **Task 2 — Orders backend: yaratish**: `qty-base.js` umumiy helper, `orders` moduli (create/list/get), narx snapshot, idempotency replay
- [x] **Task 3 — Orders backend: tasdiqlash/bekor qilish**: `confirm()` (rezerv), `cancel()` (storno)
- [x] **Task 4 — Orders backend: yig'ish/jo'natish**: `picking` o'tishi, `ship()` (warehouse_docs issue, qisman miqdor)
- [x] **Task 5 — Shop-catalog backend**: sotuv nuqtasi uchun narx+qoldiq birlashtirilgan ro'yxat
- [x] **Task 6 — `apps/shop` skeleti**: yangi PWA ilova, `vite-plugin-pwa`, auth
- [x] **Task 7 — `apps/shop`: katalog/savat/checkout**
- [x] **Task 8 — `apps/shop`: zakazlarim (ro'yxat+tafsilot)**
- [x] **Task 9 — `apps/web`: sklad tomoni UI**: sotuv nuqtalari CRUD, zakazlar navbati/pick list/tasdiqlash/jo'natish/bekor qilish

Faza 5 "Natija" mezoni (PLAN.md): do'kon operatori shop.murcha.uz'ni telefoniga o'rnatib zakaz beradi; "do'kon zakaz berdi → sklad yig'di" oqimi to'liq o'tadi.
