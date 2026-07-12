# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 4 — Shtrix-kod, Excel, inventarizatsiya

Kerakli Prisma modellar (`InventoryCount`, `InventoryCountItem`) Faza 0'da tayyor — sxema o'zgarmaydi. `ProductBarcode`/`ProductBarcodesRepository.findByBarcode` Faza 2'da yozilgan. Arxitektura qarorlari (BarcodeDetector API+USB skaner, jsbarcode yorliq, exceljs export/BullMQ import, inventarizatsiya tasdiqlashda darhol-confirmed tuzatish hujjati) — Task 1 boshida plan-rejimda kelishilgan.

- [x] **Task 1 — Counterparties CRUD**: `counterparties` moduli (standart CRUD, `warehouses` qolipi) — PO/hujjat yaratishda yetkazib beruvchi tanlash va Excel kontragent import/export uchun prerequisite
- [x] **Task 2 — Shtrix-kod qidiruv**: `GET /api/v1/products/by-barcode/:barcode` — mavjud `ProductBarcodesRepository.findByBarcode` qayta ishlatiladi
- [x] **Task 3 — Excel export**: `GET /api/v1/exports/products|stock|counterparties` — `exceljs` bilan `.xlsx` generatsiya
- [x] **Task 4 — Excel import**: `POST /api/v1/imports/:type` (BullMQ job) + `GET /api/v1/imports/:jobId` (holat+hisobot)
- [x] **Task 5 — Inventarizatsiya boshlash + sanoq**: `inventory-counts` moduli — boshlash (`systemQty` suratga olinadi), `countedQty` kiritish
- [x] **Task 6 — Inventarizatsiya tasdiqlash**: farqlar uchun avtomatik tasdiqlangan tuzatish hujjatlari (kirim/spisaniye)
- [x] **Task 7 — Frontend: shtrix-kod/yorliq/Excel**: skaner sahifasi (kamera+USB), yorliq chop etish, Excel import/export UI
- [x] **Task 8 — Frontend: inventarizatsiya**: boshlash → sanoq kiritish → farqlar → tasdiqlash

Faza 4 "Natija" mezoni (PLAN.md): telefon kamerasi bilan mahsulot topiladi; 1000 qatorli Excel import qilinadi.
