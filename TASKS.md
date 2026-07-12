# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 9 — Kassa, valyuta, chop etish

`CashRegister`/`CashShift`/`ExpenseCategory`/`Transaction`/`ExchangeRate` Prisma modellari Faza 0'dan tayyor (yangi migratsiya kerak emas). `Payment.cashRegisterId`/`Transaction.paymentId` bog'lanishlari Faza 8'dan tayyor, lekin ishlatilmagan. `companies` moduli birinchi marta shu fazada yaratiladi (hozir faqat repository bor). Arxitektura qarorlari (kassa — bitta modul uch resurs, Transaction immutable, smena balansi `occurredAt` oynasi bilan yangi ustunsiz, valyuta konvertatsiyasi sotuv vaqtida `lib/currency.js`, chop etish `debts.pdf.js` naqshi bilan logo qo'shib) — Task 1 boshida plan-rejimda kelishilgan.

- [x] **Task 1 — Cash backend core**: `cash` moduli (registers/expense-categories/transactions CRUD+list), `cash.view` ruxsat kodi, `immutable.sql`ga `transactions`
- [x] **Task 2 — Kun yopish + to'lov↔kassa bog'lanishi**: `CashShift` ochish/yopish (`expectedBalance`/`diff`), `payments.service.js`ga `transactionsRepository` DI
- [x] **Task 3 — Valyuta**: `exchange-rates` moduli, `lib/currency.js`, CBU kunlik job, `orders.service.js`/`shop-catalog.service.js`da USD→UZS konvertatsiya
- [x] **Task 4 — Kompaniya brendingi**: `companies` moduli (service/controller/routes birinchi marta), logo yuklash, `PATCH /companies/me` (settings)
- [x] **Task 5 — Chop etish**: `printing.pdf.js` (nakladnaya + akt, logo bilan), `GET /orders/:id/invoice.pdf`, `GET /warehouse-docs/:id/act.pdf`
- [x] **Task 6 — Frontend: kassa + kompaniya sozlamalari (`apps/web`)**: `cash.api.js`, registerlar/tranzaksiyalar, smena ekrani, `CompanySettingsPage.vue`
- [x] **Task 7 — Frontend: chop etish + inkassatsiya (`apps/web`)**: "Chop etish" tugmalari, `DeliveryDetailPage.vue`da "Kassaga topshirish"

Faza 9 "Natija" mezoni (PLAN.md): kun yopilganda kassa farqi ko'rinadi; nakladnaya logo bilan chiqadi.
