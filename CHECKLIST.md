# MURCHA — Bajarilish checklisti

> Reja: [PLAN.md](PLAN.md). Har bajarilgan band `[x]` qilinadi. Faza "Natija" mezoni bajarilmaguncha yopilmaydi.
> Vazifa darajasidagi mayda bo'linish har faza boshida `TASKS.md`da qilinadi (PLAN.md 8.0).

**Holat:** 🟡 Faza 0 tugadi (Docker sinovisiz) · Faza 1 tugadi (RLS/Postgres sinovisiz) | Oxirgi yangilanish: 2026-07-11

---

## 📋 Kod boshlashdan oldin (rasmiy qadamlar)

- [ ] murcha.uz domenini cctld.uz orqali tekshirish va band qilish
- [ ] Zaxira domenlar qarori (murchaapp.uz / murcha.io — kerak bo'lsa)
- [ ] IMA (ima.uz) bazasida "Murcha" tovar belgisini tekshirish
- [ ] "Murcha" tovar belgisiga ariza topshirish (9/42-sinflar)
- [ ] Google Play / App Store'da "Murcha" yo'qligini tekshirish
- [ ] @murcha_uz Telegram handle'ini band qilish
- [ ] Instagram/YouTube handle'larini band qilish
- [ ] Hosting tanlash (UZCLOUD / ahost.uz — shaxsiy ma'lumotlar qonuni talabi)
- [ ] GitHub repo yaratish (private)

---

## Faza 0 — Skelet va infratuzilma (1 hafta)

- [x] Monorepo skeleti (pnpm workspaces: apps/web, apps/shop, apps/landing, apps/api, packages/shared, packages/ui)
- [x] ESLint + Prettier + JSDoc sozlamalari
- [x] **CLAUDE.md** — kod konventsiyalari, qatlam qoidalari, modul qolipi, git workflow
- [x] Repo intizomi: git init, BACKLOG.md + PROGRESS.md (himoyalangan main — GitHub repo yaratilgach sozlanadi)
- [x] Docker Compose: postgres, redis, minio, api, worker, web, nginx (skelet — api/worker hali placeholder, Task 4'da haqiqiy server bo'ladi)
- [x] Prisma sxema (DATABASE.md asosida — to'liq sxema o'sha yerda) yozildi, `prisma validate`/`generate` o'tdi; birinchi migratsiya Postgres ulanganda qo'llaniladi (`apps/api/prisma/README.md`)
- [x] Seed data + RLS siyosatlari (`apps/api/prisma/seed.js`, `rls.sql`, `checks.sql`, `immutable.sql`)
- [x] CI (GitHub Actions): lint + format + prisma validate + test har push/PR'da (`.github/workflows/ci.yml`)
- [x] pino log, /healthz (DB+Redis), Sentry ulanishi — `apps/api/src`
- [x] Dizayn skill'lar: Impeccable (`.claude/skills/impeccable`, loyiha ichida), taste-skill (13) + emilkowalski animatsiya skill'i (5) `npx skills` orqali (`skills-lock.json` commit qilinadi), Graphify ishga tushirildi (`graphify-out/GRAPH_REPORT.md` — 329 tugun/59 hamjamiyat)
- [ ] ✅ **Natija: `docker compose up` → bo'sh ilova ochiladi, API /healthz javob beradi, CI yashil**
      — barcha kod tayyor va lokal (Docker'siz) tekshirildi: `pnpm test`/`pnpm lint` yashil, `node apps/api/src/index.js` bilan `/healthz` qo'lda ishlatib ko'rildi. Faqat `docker compose up`ning o'zi mahalliy Docker o'rnatilmagani sababli sinalmagan — birinchi marta Docker mavjud mashinada tasdiqlanishi kerak

## Faza 1 — Auth va kompaniya (1 hafta)

- [x] Ro'yxatdan o'tish (telefon + kompaniya), login (`POST /auth/register`, `/auth/login`, `/auth/select-company`)
- [x] JWT (access, 15 daq) + refresh token rotation (Redis, opaque token, reuse detection)
- [x] RBAC middleware + tayyor rollar (`requireAuth`, `requirePermission`, Faza 0 seed rollari)
- [x] company_members (bir user — bir nechta kompaniya) — RLS `user_id` o'z-egalik istisnosi bilan
- [x] Rate-limit (IP, Redis), brute-force bloklash (telefon, 5 urinish/15 daq)
- [x] Sessiyalar ro'yxati / uzish (`GET/DELETE /auth/sessions`, `POST /auth/logout`)
- [ ] ✅ **Natija: kompaniya ochib kirib-chiqib bo'ladi; RLS izolyatsiya testi o'tadi**
      — barcha kod yozilgan va testlangan (115/115 test yashil, mock Prisma/Redis bilan — real DB'ga ulanish mahalliy Postgres yo'qligi sababli hali sinalmagan, Faza 0'dagi bilan bir xil cheklov). Haqiqiy RLS izolyatsiyasi (ikkinchi kompaniya ma'lumoti ko'rinmasligi) Postgres mavjud mashinada birinchi marta tasdiqlanishi kerak

## Faza 2 — Mahsulot katalogi (1–2 hafta)

- [x] TASKS.md — faza vazifalarga bo'lindi (8 vazifa)
- [x] Prisma product modellari — Faza 0'da yozilgan (`Product`/`Category`/`Unit`/`ProductUnit`/`ProductBarcode`/`ProductImage`/`PriceType`/`ProductPrice`/`ProductVariant`/`Batch`/`Stock`); migratsiya mahalliy Postgres yo'qligi sababli hali qo'llanilmagan (Faza 0/1'dagi bilan bir xil cheklov)
- [x] Products backend moduli (repository → service → controller + testlar)
- [x] Kategoriyalar daraxti backend (`categories` moduli) + o'lchov birliklari / o'ram konvertatsiyasi (`ProductUnit`) va shtrix-kodlar (`ProductBarcode`)
- [x] Narx turlari + narx tarixi (`price-types` + `product-prices` modullari, immutable), variantlar (`product-variants`, `attributes` JSONB) — custom maydonlar (JSONB) Task 2'da (`products.custom`)
- [x] Rasm yuklash (MinIO + sharp thumbnail, BullMQ) — real MinIO/Redis worker bilan hali sinalmagan (mahalliy infratuzilma yo'q, Faza 0/1'dagi bilan bir xil cheklov)
- [x] Skladlar CRUD (`warehouses` moduli)
- [ ] Katalog UI: ro'yxat, forma, qidiruv/filter (full-text)
- [ ] ✅ **Natija: 100 ta mahsulotli katalog rasmlari bilan telefonda tez ochiladi**

## Faza 3 — Sklad operatsiyalari (1–2 hafta)

- [ ] Kirim / chiqim / spisaniye / ko'chirish hujjatlari (tasdiqlash + storno)
- [ ] stock_movements jurnali, qoldiq + rezerv hisobi
- [ ] Tranzaksiya + qator qulfi (`SELECT ... FOR UPDATE`), manfiy qoldiq taqiqi
- [ ] Boshlang'ich qoldiq kirimi, o'rtacha tannarx
- [ ] Minimal qoldiq ogohlantirishi
- [ ] Postavshchik zakazi (purchase order) → kirim shu asosda
- [ ] ✅ **Natija: invariant test (movements = qoldiq) + parallel chiqim race-condition testi o'tadi**

## Faza 4 — Shtrix-kod, Excel, inventarizatsiya (1 hafta)

- [ ] Shtrix-kod skaner: PWA kamera + USB
- [ ] Yorliq (etiketka) chop etish
- [ ] Excel import/export (mahsulot, qoldiq, kontragent) — worker'da
- [ ] Inventarizatsiya: sanoq rejimi → farqlar → tasdiqlash → tuzatish hujjatlari
- [ ] ✅ **Natija: kamera bilan mahsulot topiladi; 1000 qatorli Excel import bo'ladi**

## Faza 5 — B2B zakaz portali (2 hafta) ← killer feature

- [ ] Sotuv nuqtalari boshqaruvi (counterparty bog'lanishi, narx turi biriktirish)
- [ ] apps/shop skeleti (alohida PWA, packages/ui bilan)
- [ ] Do'kon: katalog (o'z narxlari) → savat → zakaz (idempotency key, rezerv)
- [ ] Sklad: zakaz navbati, tasdiqlash, pick list, statuslar oqimi
- [ ] Qisman yetkazish / backorder
- [ ] Zakazni bekor qilish (storno)
- [ ] ✅ **Natija: do'kon shop.murcha.uz'ni telefonga o'rnatib zakaz beradi; E2E "zakaz→yig'ish" o'tadi**

## Faza 6 — Hodimlar va bildirishnomalar (1 hafta)

- [ ] Hodimlar UI: yaratish, rol / maxsus rol (ruxsatlar matritsasi), biriktirish, bloklash
- [ ] SMS (Eskiz.uz) — hodim/do'kon taklifi (tegishli ilova linki bilan)
- [ ] Parolni tiklash: ega hodimnikini tiklaydi + "parolni unutdim" (SMS OTP, muddat + urinish limiti, sessiyalar bekor)
- [ ] Socket.IO real-time + Web Push (ikkala ilovada)
- [ ] Hodim statistikasi (kim qancha yig'di/sotdi)
- [ ] ✅ **Natija: hodim SMS link bilan kiradi; yangi zakazda sklad telefoni "ding" etadi (ilova yopiq bo'lsa ham)**

## Faza 7 — Dostavka va kuryer xaritada (1–2 hafta)

- [ ] Zakazni kuryerga biriktirish
- [ ] Kuryer PWA ekrani (ro'yxat, summalar)
- [ ] GPS uzatish (Geolocation + Socket.IO)
- [ ] Jonli xarita (Leaflet) — ega/dispetcher + do'kon ko'radi
- [ ] Qabul qilish + farqlar akti + yetkazish tasdig'i (apps/shop'da)
- [ ] Qaytarish (vozvrat)
- [ ] ✅ **Natija: kuryer nuqtasi xaritada jonli siljiydi; do'kon PWA'da farq belgilab qabul qiladi**

## Faza 8 — Qarz (nasiya) boshqaruvi (2 hafta)

- [ ] debt_movements jurnali
- [ ] Kredit limiti + zakaz tasdiqlashda tekshiruv (Faza 5'ga ulanadi)
- [ ] To'lov muddatlari, overdue belgilash
- [ ] To'lovlar + taqsimlash (FIFO/qo'lda), qisman to'lovlar
- [ ] Aging report (0–15/16–30/31–60/60+)
- [ ] Solishtirish dalolatnomasi (PDF)
- [ ] Realizatsiya (konsignatsiya) rejimi
- [ ] Avtomatik eslatmalar
- [ ] Do'kon PWA'da qarz balansi + to'lov tarixi
- [ ] ✅ **Natija: nasiya oqimi testi — zakaz → qisman to'lov → aging to'g'ri → limitda blok**

## Faza 9 — Kassa, valyuta, chop etish (1–2 hafta)

- [ ] Kassa/hisob raqamlar, tranzaksiyalar, xarajat kategoriyalari
- [ ] Zakaz ↔ to'lov bog'lanishi
- [ ] Kun yopish (smena) + kuryer inkassatsiyasi
- [ ] Valyuta: USD narxlar, CBU kursi avtomatik, valyutali qarz
- [ ] Kompaniya brendingi: logo yuklash + brend rangi
- [ ] Chop etish: nakladnaya, aktlar (logo bilan, A4/termoprinter)
- [ ] ✅ **Natija: kun yopilganda kassa farqi ko'rinadi; nakladnaya logo bilan chiqadi**

## Faza 10 — Dashboard va hisobotlar (1 hafta)

- [ ] Ega dashboardi (ECharts): sotuv, kassa, qarzdorlik, muddati o'tganlar, tugayotgan mahsulotlar
- [ ] Hisobotlar: sotuv dinamikasi, foyda/marja, top mahsulotlar, sklad aylanmasi, qarzdorlik reestri
- [ ] Audit log UI
- [ ] ✅ **Natija: ega ertalab 5 daqiqada butun biznes holatini ko'radi**

## Faza 11 — Landing, vitrina, super-admin (1–2 hafta)

- [ ] murcha.uz landing (vite-ssg): hero, imkoniyatlar, tariflar, CTA — uz/ru
- [ ] SEO: meta/OG, sitemap, Schema.org, hreflang
- [ ] Kompaniya vitrinasi: profil + ochiq katalog + zakaz so'rovi (lead) — server-render
- [ ] Super-admin panel: kompaniyalar, tarif limitlari, obuna holati
- [ ] ✅ **Natija: Google "site:murcha.uz" indekslaydi; vitrinadan lid egaga tushadi**

## Faza 12 — Sayqal va ishga tushirish (1–2 hafta)

- [ ] Demo-rejim + onboarding checklist (interaktiv)
- [ ] uz/ru lokalizatsiya to'liq (vue-i18n)
- [ ] PWA offline + Background Sync (ikkala ilova)
- [ ] Prod: nginx + SSL (Let's Encrypt), CD zero-downtime
- [ ] Backup + restore sinovi, Uptime Kuma
- [ ] Xavfsizlik auditi (OWASP, penetration test)
- [ ] Oferta + maxfiylik siyosati joylandi
- [ ] Pilot: 2–3 real biznes, 2 hafta
- [ ] ✅ **Natija: haqiqiy distribyutor real zakazlarini Murcha orqali o'tkazyapti**

---

## 🔁 Har faza yopilishida (takrorlanuvchi)

- [ ] Barcha testlar yashil (Vitest + Supertest, kerak joyda Playwright)
- [ ] `/graphify` yangilandi — qatlam buzilishi yo'q
- [ ] Yangi ekranlar dizayn-review qilindi (Impeccable/taste-skill)
- [ ] Texnik qarz sloti: yarim kun refactor + `/simplify`
- [ ] CHECKLIST.md va TASKS.md yangilandi

## 📌 Jarayon nazorati (team-lead, doimiy)

- [ ] Faza 2'dan keyin: plan/fakt velocity solishtirildi, qolgan fazalar qayta baholandi
- [ ] Faza 5'dan keyin: pilot mijozlarga demo ko'rsatildi, jalb boshlandi
- [ ] Faza 8'gacha: 2–3 pilot biznes bilan kelishuv bor
- [ ] Har hafta: retro (15 daq) + PROGRESS.md yangilandi
- [ ] Yangi g'oyalar BACKLOG.md ga ketyapti (MVP scope buzilmayapti)

---

## 🔮 Keyingi bosqich (MVP'dan keyin — alohida rejalashtiriladi)

- [ ] ЭСФ integratsiya (didox/faktura.uz)
- [ ] Payme/Click (obuna + mijoz to'lovlari)
- [ ] POS rejim
- [ ] Telegram-bot (do'kon PWA'siga qo'shimcha kanal)
- [ ] To'liq budjetlash (plan/fakt, cash-flow)
- [ ] Kuryer marshrut optimallashtirish
- [ ] Ishlab chiqarish moduli
- [ ] Markirovka integratsiyasi
- [ ] Marketplace rejimi
- [ ] 2FA (TOTP), vitrinaga o'z domeni
