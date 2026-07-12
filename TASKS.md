# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 8 — Qarz (nasiya) boshqaruvi

`DebtMovement`/`Payment`/`PaymentAllocation` Prisma modellari Faza 0'dan tayyor (yangi migratsiya kerak emas). `debts.view`/`debts.manage` ruxsat kodlari seed.js'da allaqachon bor edi, lekin hech qaysi modul ishlatmagan edi. Arxitektura qarorlari (kredit limit `confirm()`da `debts.manage` bypass bilan, aging `Order.dueDate` orqali order-netto, FIFO/qo'lda to'lov taqsimlash, `pdfmake` bilan akt sverki, Redis-asoslangan kompaniyalar ro'yxati orqali kunlik eslatma job'i RLS bypass'siz) — Task 1 boshida plan-rejimda kelishilgan.

- [x] **Task 1 — Debts backend core**: `debts` moduli (balans/statement/aging/adjustment, `/me/*` egalik), `debt.schemas.js`, `CreditLimitExceededError`, `seed.js` rol ruxsatlari (`accountant`, `warehouse_manager: debts.view`)
- [x] **Task 2 — Kredit limit + qarz yozuvlari (`orders.service.js`)**: `confirm()`da limit tekshiruvi (+ `settings.creditLimitMode`), `accept()`/`returnItems()`da `debt_movement` yozuvlari
- [x] **Task 3 — Payments moduli**: FIFO avtomatik + qo'lda taqsimlash, `payment.schemas.js`
- [x] **Task 4 — Aging hisoboti + akt sverki PDF**: `pdfmake` (standart Helvetica shrift), `GET /debts/counterparties/:id/statement.pdf`
- [x] **Task 5 — Kunlik eslatma job**: `lib/companies-registry.js` (Redis), backfill skripti, BullMQ repeat job, `NotificationsService.notifyDebtReminder`
- [x] **Task 6 — Frontend: qarz boshqaruvi (`apps/web`)**: `SalePointFormPage.vue`ga "Qarz holati" karta, `CounterpartyStatementPage.vue`, `DebtsAgingPage.vue`
- [x] **Task 7 — Frontend: do'kon qarzi (`apps/shop`)**: `MyDebtPage.vue`, pastki-nav bandi

Faza 8 "Natija" mezoni (PLAN.md): nasiyaga zakaz → qisman to'lov → aging report'da to'g'ri ko'rinishi → limit oshganda zakaz bloklanishi.
