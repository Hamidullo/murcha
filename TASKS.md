# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 6 — Hodimlar va bildirishnomalar

`CompanyMember`/`Role`/`Permission`/`RolePermission`/`Notification` Prisma modellari Faza 0'dan tayyor (faqat `Notification` uchun `PushSubscription` Task 6'da qo'shiladi — sxemadagi yagona haqiqiy bo'shliq). Arxitektura qarorlari (taklif/parol-tiklash token mexanizmi, SMS/Web Push graceful degradation, domen hodisalari, Socket.IO auth) — Task 1 boshida plan-rejimda kelishilgan.

- [x] **Task 1 — Hodimlar+rollar backend**: `company-members` moduli (yaratish parolsiz + `UserAssignment` biriktirish, ro'yxat/bloklash/rol o'zgartirish), `roles` moduli (maxsus rol CRUD + ruxsatlar matritsasi)
- [x] **Task 2 — SMS + taklif/parol-tiklash tokenlari**: `lib/sms.js` (Eskiz.uz), hodim taklif SMS, `POST /auth/set-password`, admin majburiy parol tiklash
- [x] **Task 3 — O'z-o'zini parolni tiklash**: `POST /auth/forgot-password`/`reset-password` (OTP SMS, urinish limiti, sessiyalar bekor)
- [x] **Task 4 — Domen hodisalari + bildirishnomalar**: `lib/events.js`, `order.new` emit, `notifications` moduli
- [x] **Task 5 — Socket.IO**: real-time yetkazish (JWT auth, company-xona)
- [x] **Task 6 — Web Push backend**: `PushSubscription` modeli (yangi migratsiya), VAPID, `push-subscriptions` moduli
- [x] **Task 7 — Frontend: hodimlar/rollar/real-time (`apps/web`)**: hodimlar UI, rol matritsasi, Socket.IO klient, Web Push obuna, `vite-plugin-pwa`
- [x] **Task 8 — Frontend: parolni tiklash (`apps/web`+`apps/shop`)**: forgot-password + set-password sahifalari

Faza 6 "Natija" mezoni (PLAN.md): yangi hodim SMS'dagi link bilan kiradi; yangi zakaz kelganda sklad telefoni "ding" etadi (ilova yopiq bo'lsa ham).
