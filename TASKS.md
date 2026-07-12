# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 10 — Dashboard va hisobotlar

`AuditLog` Prisma modeli va immutable trigger Faza 0'dan tayyor, lekin hech qayerda yozilmagan. `debts.service.js getAging()` (Faza 8) qarzdorlik reestri talabini allaqachon qondiradi — yangi backend kerak emas. Arxitektura qarorlari (audit log — tanlangan olti servis, `ip` yozilmaydi; hisobotlar — `status:"accepted"`+`qtyAccepted×price`, guruhlash service qatlamida JS reduce; marja — joriy o'rtacha tannarx, `lib/inventory-cost.js`ga chiqarilgan; sklad aylanmasi — joriy qoldiqni o'rtacha sifatida ishlatib; dashboard — repository darajasida qayta ishlatish, servis-servisga bog'lanmaydi; standart bosh sahifa o'zgarmaydi, `dashboard` alohida route) — Task 1 boshida plan-rejimda kelishilgan.

- [x] **Task 1 — Audit log backend core**: `audit-logs` moduli, `lib/audit.js`, `audit.view` ruxsat kodi
- [x] **Task 2 — Audit log instrumentatsiya**: orders/warehouse-docs/payments/debts/cash/company-members servislariga `logAudit()`
- [x] **Task 3 — Hisobotlar backend: sotuv + mahsulot/marja**: `lib/inventory-cost.js`, `GET /reports/sales`, `GET /reports/products`
- [x] **Task 4 — Hisobotlar backend: sklad aylanmasi + dashboard**: `GET /reports/stock-turnover`, `GET /reports/dashboard`
- [x] **Task 5 — Frontend: Dashboard (`apps/web`)**: `echarts`+`vue-echarts`, `DashboardPage.vue`
- [x] **Task 6 — Frontend: Hisobotlar (`apps/web`)**: `SalesReportPage.vue`/`ProductsReportPage.vue`/`StockTurnoverPage.vue`
- [x] **Task 7 — Frontend: Audit log UI (`apps/web`)**: `AuditLogListPage.vue`

Faza 10 "Natija" mezoni (PLAN.md): ega ertalab 5 daqiqada butun biznes holatini ko'radi (dashboard orqali).
