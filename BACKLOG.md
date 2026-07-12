# BACKLOG

MVP scope PLAN.md bilan qotgan (8.0.1). Shu ro'yxatdan tashqari yangi g'oya to'g'ridan-to'g'ri kodga yoki PLAN.mgga qo'shilmaydi — avval shu yerga yoziladi, keyin alohida qaraladi.

Format: `- [ ] G'oya — kim taklif qildi, sana, qisqa sabab`

---

- [ ] Hodim statistikasi (kim qancha yig'di/sotdi) — CHECKLIST.md Faza 6'da rejalashtirilgan, lekin Faza 6'ning 8 vazifalik plan-rejim rejasiga (2026-07-12) kiritilmagan, 2026-07-12
- [ ] Realizatsiya (konsignatsiya) rejimi — CHECKLIST.md Faza 8'da rejalashtirilgan, lekin "sotilgan miqdor bo'yicha qarz" uchun hech qanday DB ustuni yo'q (mavjud accepted/returned oqimidan butunlay farqli order lifecycle kerak, yangi migratsiya talab qiladi), Faza 8'ning success test'ida qatnashmaydi, 2026-07-12
- [ ] Kredit limit uchun to'liq "egadan tasdiq so'rash" approval workflow — Faza 8'da faqat block/warn (`settings.creditLimitMode`) qo'llanildi; to'liq workflow yangi `Order.status` qiymati + approve/reject UI + bildirishnoma turi talab qiladi, 2026-07-12
- [ ] To'lovda avans/ortiqcha summani keyingi zakazga avtomatik hisoblash — Faza 8'da hozircha `orderId:null` kamaytiruvchi yozuv sifatida qoladi, qo'lda `POST /debts/adjustments` bilan keyin moslashtiriladi, 2026-07-12
