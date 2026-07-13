# BACKLOG

MVP scope PLAN.md bilan qotgan (8.0.1). Shu ro'yxatdan tashqari yangi g'oya to'g'ridan-to'g'ri kodga yoki PLAN.mgga qo'shilmaydi — avval shu yerga yoziladi, keyin alohida qaraladi.

Format: `- [ ] G'oya — kim taklif qildi, sana, qisqa sabab`

---

- [ ] Hodim statistikasi (kim qancha yig'di/sotdi) — CHECKLIST.md Faza 6'da rejalashtirilgan, lekin Faza 6'ning 8 vazifalik plan-rejim rejasiga (2026-07-12) kiritilmagan, 2026-07-12
- [ ] Realizatsiya (konsignatsiya) rejimi — CHECKLIST.md Faza 8'da rejalashtirilgan, lekin "sotilgan miqdor bo'yicha qarz" uchun hech qanday DB ustuni yo'q (mavjud accepted/returned oqimidan butunlay farqli order lifecycle kerak, yangi migratsiya talab qiladi), Faza 8'ning success test'ida qatnashmaydi, 2026-07-12
- [ ] Kredit limit uchun to'liq "egadan tasdiq so'rash" approval workflow — Faza 8'da faqat block/warn (`settings.creditLimitMode`) qo'llanildi; to'liq workflow yangi `Order.status` qiymati + approve/reject UI + bildirishnoma turi talab qiladi, 2026-07-12
- [ ] To'lovda avans/ortiqcha summani keyingi zakazga avtomatik hisoblash — Faza 8'da hozircha `orderId:null` kamaytiruvchi yozuv sifatida qoladi, qo'lda `POST /debts/adjustments` bilan keyin moslashtiriladi, 2026-07-12
- [ ] Kuryer inkassatsiyasi uchun idempotency (ikki marta "Kassaga topshirish" bosilsa ikki marta yozilishi mumkin) — Faza 9'da yangi `Delivery` ustuni/migratsiya qo'shilmadi, qo'lda tekshirish bilan cheklandi (loyihaning mavjud risk-qabul darajasiga mos), 2026-07-12
- [ ] To'liq "valyutali qarz" (masalan postavshchikga USD qarz) hisobot/UI — `DebtMovement.currency` Faza 8'dan valyuta-agnostik ishlaydi, lekin Faza 9'da alohida USD qarz ekrani qo'shilmadi (faqat mijoz-tomon UZS qarz UI bor), 2026-07-12
- [ ] Audit log to'liq qamrov — Faza 10'da faqat olti servis (orders/warehouse-docs/payments/debts/cash/company-members) `logAudit()` chaqiradi; `roles`, `sale-points`, `products`, `companies.updateMe` va boshqa mutatsiyalar hali yozilmaydi, 2026-07-12
- [ ] Audit log yozuviga `req.ip` — hozircha bo'sh; servis qatlami HTTP request'ni bilmaydi, `req.ip`ni servisgacha o'tkazish katta refaktoring talab qiladi, 2026-07-12
- [ ] Marja/sklad aylanmasi hisobotlari — joriy o'rtacha tannarx/joriy qoldiq bilan hisoblanadi (tarixiy/vaqt-og'irlikli o'rtacha emas), aniqroq hisobot uchun sotuv/harakat vaqtidagi tannarx snapshot kerak bo'ladi, 2026-07-12
- [ ] `apps/web`da o'z-o'zidan ro'yxatdan o'tish sahifasi yo'q — backend `POST /auth/register` (`registerCompany()`) Faza 0'dan tayyor, lekin hech qanday frontend forma chaqirmaydi; Faza 11'da landing'ning "Bepul boshlash" tugmasi hozircha `/login`ga yo'naltiriladi, 2026-07-13
- [ ] Super-admin (`platform-auth`) uchun refresh-token/sessiya oqimi yo'q — Faza 11'da ataylab qo'shilmadi (MVP soddalashtirish, kamdan-kam ochiladigan panel), token TTL 12soat, muddati o'tsa qayta kirish kerak, 2026-07-13
- [ ] Vitrina (`showcase`) mahsulot rasmlari uchun presigned URL TTL 15 daqiqa — server-render har so'rovda yangi URL generatsiya qilgani uchun MVP'da yetarli, lekin CDN/uzoq muddatli keshlash qo'shilsa qayta ko'rib chiqiladi, 2026-07-13
- [ ] `murcha.uz` (landing/vitrina) haqiqiy domen-asosli nginx routing — Faza 11'da `docker-compose.yml`ga `landing` servisi alohida port (4173) bilan qo'shildi, lekin asosiy `nginx`ning `/` marshrutiga ulanmagan; to'liq subdomen ajratish (murcha.uz/app./shop./api.) Faza 12 qamrovi, 2026-07-13
