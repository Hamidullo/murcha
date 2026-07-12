# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 3 — Sklad operatsiyalari

Prisma sxemasi bu faza uchun kerakli barcha modellarni Faza 0'da o'z ichiga oladi (`Stock`, `WarehouseDoc`, `WarehouseDocItem`, `StockMovement`, `PurchaseOrder`, `PurchaseOrderItem`, `InventoryCount`, `InventoryCountItem`, `DocCounter`) — sxema o'zgarmaydi, faqat modul kodi yoziladi. Arxitektura qarorlari (qulflash texnikasi, deadlock oldini olish, storno, o'rtacha tannarx, hujjat raqamlash) — Task 1/2 boshida plan-rejimda kelishilgan, qisqacha bayoni PROGRESS.md 2026-07-12 yozuvida.

- [x] **Task 1 — Warehouse-docs qoralama**: `warehouse-docs` moduli — CRUD (`status: draft`), item qo'shish/o'chirish, `doc_counters` orqali raqamlash (`KIR/CHIQ/SPIS/KOCH-YYYY-NNNNN`), `qtyBase` hisoblash (`ProductUnit.factor`)
- [x] **Task 2 — Tasdiqlash oqimi**: `confirm(docId)` — turga qarab signed `qty`, `Stock` atomik upsert (`increment`), `StockMovement` yozuvlari, `InsufficientStockError`, transfer uchun deadlock-xavfsiz qulflash tartibi
- [x] **Task 3 — Storno**: `cancel(docId)` — faqat `confirmed`dan, teskari harakatlar, `status: cancelled`
- [x] **Task 4 — Stock moduli**: qoldiq ro'yxati (sklad/mahsulot kesimida), low-stock (`quantity <= minQty`) ro'yxati, o'rtacha tannarx hisoblash endpointi
- [x] **Task 5 — Purchase orders**: `purchase-orders` moduli — CRUD, PO asosida kirim (`WarehouseDoc` yaratish + `qtyReceived` yangilash)
- [x] **Task 6 — Invariant + race-condition testlar**: `SUM(stock_movements.qty) = stock.quantity` invariant testi, ikki parallel chiqim/tasdiqlash race-condition testi
- [x] **Task 7 — Frontend**: sklad hujjatlar ro'yxati + yaratish/tasdiqlash/bekor qilish UI (kirim/chiqim minimal ko'lamda)

Faza 3 "Natija" mezoni (PLAN.md): invariant test o'tadi; ikki parallel chiqim race-condition testi o'tadi.
