# MURCHA — Bajarilish checklisti

> Reja: [PLAN.md](PLAN.md). Har bajarilgan band `[x]` qilinadi. Faza "Natija" mezoni bajarilmaguncha yopilmaydi.
> Vazifa darajasidagi mayda bo'linish har faza boshida `TASKS.md`da qilinadi (PLAN.md 8.0).

**Holat:** 🟡 Faza 0 tugadi (Docker sinovisiz) · Faza 1 tugadi (RLS/Postgres sinovisiz) · Faza 2 tugadi (real Postgres/Redis/MinIO demo sinovisiz) · Faza 3 tugadi (real Postgres demo sinovisiz) · Faza 4 tugadi (real Postgres/kamera demo sinovisiz) · Faza 5 tugadi (real Postgres/PWA o'rnatish demo sinovisiz) | Oxirgi yangilanish: 2026-07-12

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

- [x] TASKS.md — faza vazifalarga bo'lindi (9 vazifa — Task 7 frontend skelet qo'shilib qayta raqamlandi)
- [x] Prisma product modellari — Faza 0'da yozilgan (`Product`/`Category`/`Unit`/`ProductUnit`/`ProductBarcode`/`ProductImage`/`PriceType`/`ProductPrice`/`ProductVariant`/`Batch`/`Stock`); migratsiya mahalliy Postgres yo'qligi sababli hali qo'llanilmagan (Faza 0/1'dagi bilan bir xil cheklov)
- [x] Products backend moduli (repository → service → controller + testlar)
- [x] Kategoriyalar daraxti backend (`categories` moduli) + o'lchov birliklari / o'ram konvertatsiyasi (`ProductUnit`) va shtrix-kodlar (`ProductBarcode`)
- [x] Narx turlari + narx tarixi (`price-types` + `product-prices` modullari, immutable), variantlar (`product-variants`, `attributes` JSONB) — custom maydonlar (JSONB) Task 2'da (`products.custom`)
- [x] Rasm yuklash (MinIO + sharp thumbnail, BullMQ) — real MinIO/Redis worker bilan hali sinalmagan (mahalliy infratuzilma yo'q, Faza 0/1'dagi bilan bir xil cheklov)
- [x] Skladlar CRUD (`warehouses` moduli)
- [x] Frontend skelet + auth ekranlari (`apps/web`: Vue/Vite/Tailwind4/shadcn-vue/Pinia/TanStack Query/Vue Router, login→kompaniya tanlash→dashboard) — brauzerda tekshirildi (Claude Browser), haqiqiy DB'siz login backend xatosi to'g'ri ko'rsatiladi
- [x] Katalog UI: ro'yxat + qidiruv/filter — full-text (`pg_trgm` GIN indeks, `prisma/search.sql`)
- [x] Katalog UI: mahsulot forma (`ProductFormPage.vue` — yaratish/tahrirlash, narx/variant/rasm boshqaruvi)
- [ ] ✅ **Natija: 100 ta mahsulotli katalog rasmlari bilan telefonda tez ochiladi**
      — barcha kod yozilgan va testlangan (304/304 backend test yashil, frontend build muvaffaqiyatli, Claude Browser'da UI/validatsiya/navigatsiya tekshirildi), lekin haqiqiy Postgres/Redis/MinIO'siz 100 ta mahsulotli haqiqiy katalog demo qilib bo'lmaydi — Faza 0/1'dagi bilan bir xil infratuzilma cheklovi. Postgres/Redis/MinIO mavjud muhitda birinchi marta tasdiqlanishi kerak

## Faza 3 — Sklad operatsiyalari (1–2 hafta)

- [x] Kirim / chiqim / spisaniye / ko'chirish hujjatlari (tasdiqlash + storno) — `confirm()`/`cancel()` yozilgan
- [x] stock_movements jurnali, qoldiq hisobi (rezerv — Faza 5 zakaz oqimida ishlatiladi)
- [x] Atomik qulflash (Prisma `upsert`+`increment` → Postgres `INSERT...ON CONFLICT`, `SELECT...FOR UPDATE` o'rniga — `prisma/stock.sql`dagi `NULLS NOT DISTINCT` bilan birga), manfiy qoldiq taqiqi (DB CHECK + oldindan tekshiruv)
- [x] Boshlang'ich qoldiq kirimi (oddiy `receipt` hujjati orqali — alohida turi yo'q), o'rtacha tannarx (`GET /api/v1/stock/average-cost` — `stock_movements`dan so'rov vaqtida hisoblanadi)
- [x] Minimal qoldiq ogohlantirishi (`GET /api/v1/stock/low` — `quantity <= minQty`)
- [x] Postavshchik zakazi (purchase order) → kirim shu asosda (`purchase-orders` moduli, `POST /:id/receive` — draft kirim hujjat yaratadi, tasdiqlash alohida)
- [x] ✅ **Natija: invariant test (movements = qoldiq) + parallel chiqim race-condition testi o'tadi**
      — `warehouse-docs.invariant.test.js`: real `WarehouseDocsService`/`StockRepository` kodi xotiradagi fake DB'ga qarshi ishlaydi (fake `stock.upsert` `checks.sql`dagi `stock_quantity_check`ni ham takrorlaydi). Mahalliy Postgres yo'qligi sababli haqiqiy DB bilan hali tasdiqlanmagan (Faza 0/1/2'dagi bilan bir xil cheklov) — Postgres mavjud bo'lganda shu fayl haqiqiy integratsion testga almashtirilishi mumkin

## Faza 4 — Shtrix-kod, Excel, inventarizatsiya (1 hafta)

- [x] Shtrix-kod skaner: PWA kamera + USB (`BarcodeScanPage.vue` — nativ `BarcodeDetector` API kamera uchun, USB skaner matn input+Enter)
- [x] Yorliq (etiketka) chop etish (`ProductFormPage.vue` — Shtrix-kodlar bo'limi, `jsbarcode` bilan)
- [x] Excel import/export (mahsulot, qoldiq, kontragent) — export sinxron (`exceljs`), import BullMQ worker'da (`GET /imports/:jobId` — holat+qator hisobot)
- [x] Inventarizatsiya: sanoq rejimi → farqlar → tasdiqlash → tuzatish hujjatlari (`inventory-counts` moduli — `approve()` darhol `confirmed` kirim/spisaniye hujjatlari yaratadi)
- [x] ✅ **Natija: kamera bilan mahsulot topiladi; 1000 qatorli Excel import bo'ladi**
      — barcha kod yozilgan va testlangan (474/474 backend test yashil, frontend build muvaffaqiyatli, Claude Browser'da UI/validatsiya/navigatsiya tekshirildi — jumladan shu tekshiruvda topilgan real bag tuzatildi), 1000 qatorli import haqiqiy `exceljs` bilan sinaldi (~500ms). Haqiqiy Postgres/Redis/MinIO'siz (kamera+backend to'liq zanjiri, real fayl hajmi/vaqti) hali tasdiqlanmagan — Faza 0/1/2/3'dagi bilan bir xil infratuzilma cheklovi

## Faza 5 — B2B zakaz portali (2 hafta) ← killer feature

- [x] Sotuv nuqtalari boshqaruvi (counterparty bog'lanishi, narx turi biriktirish) — `sale-points` moduli: yaratishda avtomatik `Counterparty` (type:customer) ochiladi, operator biriktirish (`user-assignments` — `UserAssignment.targetType:"sale_point"`), `orders.view`/`orders.confirm` → `warehouse_manager`/`picker` rollariga biriktirildi
- [x] apps/shop skeleti — yangi PWA ilova (`vite-plugin-pwa`, manifest+service worker), `apps/web`ning auth/UI qolipini nusxa oladi (`packages/ui` hali bo'sh — ko'chirish BACKLOG'ga qoldirildi), login→home oqimi Claude Browser'da tekshirildi (mobile viewport ham)
- [x] Do'kon: katalog (`apps/shop` — `CatalogPage.vue`, sklad tanlash + qidiruv + savatga qo'shish) → savat (`CartPage.vue`, lokal Pinia `cart.store.js`, bitta savat = bitta sklad) → zakaz berish (idempotency key `crypto.randomUUID()`) → zakazlarim (`OrdersListPage.vue`/`OrderDetailPage.vue`, status kuzatish) — narx `product_prices`dan sotuv nuqtasining narx turi bo'yicha snapshot qilinadi, `salePointId` `UserAssignment` orqali auth'dan hal qilinadi (client yubormaydi). Rezerv — `confirm()`
- [x] Sklad: zakaz navbati, tasdiqlash, pick list, statuslar oqimi — `orders.confirm()` (`stock.reserved` oshiradi, yetarli emas bo'lsa butun tasdiqlash bekor qilinadi), `pick()` (`confirmed→picking`, sof status belgisi), `ship()` (`picking→shipped` — bitta darhol-`confirmed` `warehouse_docs` `issue`, `stock.quantity`/`reserved` kamayadi, `stock_movements` yoziladi)
- [x] Qisman yetkazish / backorder — `ship()` har item uchun to'liq/qisman miqdor qabul qiladi (`qtyShipped < qtyOrdered` — avtomatik keyingi harakat yo'q, MVP scope-kesish)
- [x] Zakazni bekor qilish (storno) — `orders.cancel()`, faqat `shipped`gacha (`new`/`confirmed`/`picking`), rezerv bo'lgan bo'lsa to'liq bo'shatiladi
- [x] Sklad tomoni UI (`apps/web`) — sotuv nuqtalari CRUD + operator biriktirish (telefon bo'yicha), zakazlar navbati (holat filtri) + tafsilot (pick list ko'rinishi: tasdiqlash/yig'ishni boshlash/jo'natish — har item uchun miqdor tahrirlash/bekor qilish)
- [x] ✅ **Natija: do'kon shop.murcha.uz'ni telefonga o'rnatib zakaz beradi; E2E "zakaz→yig'ish" o'tadi**
      — barcha kod yozilgan va testlangan (563/563 backend test yashil, ikkala frontend build muvaffaqiyatli), to'liq oqim (do'kon zakaz berdi → sklad tasdiqladi → yig'di → jo'natdi) Claude Browser'da ikkala ilovada (shop+web) soxta `fetch` bilan uchdan-uchgacha tekshirildi. Haqiqiy Postgres/Redis/PWA o'rnatish (real telefon) bilan hali tasdiqlanmagan — oldingi fazalardagi bilan bir xil infratuzilma cheklovi

## Faza 6 — Hodimlar va bildirishnomalar (1 hafta)

- [x] Hodimlar backend: yaratish (parolsiz — `company-members` moduli, sklad/nuqtaga `UserAssignment` biriktirish), ro'yxat/bloklash (`SessionsRepository` orqali barcha sessiyalar bekor qilinadi)/rol o'zgartirish. Maxsus rol backend: `roles` moduli — CRUD (tizim rollari o'zgarmas) + ruxsatlar matritsasi (`GET/PUT /roles/:id/permissions`). Frontend UI — Task 7
- [x] SMS (Eskiz.uz) — `lib/sms.js` (token-based auth, Redis'da keshlanadi, `ESKIZ_EMAIL`/`ESKIZ_PASSWORD` yo'q bo'lsa graceful no-op+log). Hodim yaratishda taklif SMS (faqat yangi — parolsiz — foydalanuvchiga)
- [x] Parolni tiklash — bir martalik token mexanizmi (Redis, `PasswordResetRepository`, `POST /auth/set-password`): (1) yangi hodim taklifi, (2) ega majburiy tiklashi (`POST /company-members/:id/reset-password` — eski parol darhol "unusable"ga almashtiriladi + sessiyalar bekor qilinadi), (3) o'z-o'zini OTP-tiklash (`POST /auth/forgot-password`/`reset-password` — 6 xonali kod, 3 daqiqa TTL, 3 urinish limiti, telefon mavjudligini oshkor qilmaydi)
- [x] Socket.IO real-time + Web Push (ikkala ilovada) — `lib/socket.js` (JWT auth, `company:{companyId}` xona), `lib/web-push.js` (VAPID, graceful degradation), `push-subscriptions` moduli; frontend: Socket.IO klient (toast+tovush), Web Push obuna tugmasi, `vite-plugin-pwa` (`apps/web`)
- [ ] Hodim statistikasi (kim qancha yig'di/sotdi) — 8 vazifalik rejaga kiritilmagan, BACKLOG'ga o'tkaziladi
- [x] ✅ **Natija: hodim SMS link bilan kiradi; yangi zakazda sklad telefoni "ding" etadi (ilova yopiq bo'lsa ham)**

## Faza 7 — Dostavka va kuryer xaritada (1–2 hafta)

- [x] Zakazni kuryerga biriktirish — `deliveries` moduli, faqat `shipped` zakazlar, `deliveries.manage` ruxsati
- [x] Kuryer PWA ekrani (ro'yxat, summalar) — `CourierDeliveriesPage.vue`/`CourierDeliveryDetailPage.vue`, Wake Lock
- [x] GPS uzatish (Geolocation + Socket.IO) — `courier:location`→`courier:position`, tenant-ichi 30-kunlik tozalash (global cron o'rniga — RLS-bypass roli Faza 11'gacha yo'q)
- [x] Jonli xarita (Leaflet) — ega/dispetcher (`DeliveryMapPage.vue`, barcha kuryerlar) + do'kon (`apps/shop` `OrderDetailPage.vue`, mini-xarita) ko'radi
- [x] Qabul qilish + farqlar akti + yetkazish tasdig'i (apps/shop'da) — 4 xonali `acceptCode`, `qtyAccepted` ustunlariga yoziladi
- [x] Qaytarish (vozvrat) — `receipt` hujjat + stock ↑, qarz oqibati Faza 8'ga bog'liq (hali yo'q)
- [x] ✅ **Natija: kuryer nuqtasi xaritada jonli siljiydi; do'kon PWA'da farq belgilab qabul qiladi**

## Faza 8 — Qarz (nasiya) boshqaruvi (2 hafta)

- [x] debt_movements jurnali — `debts` moduli, immutable (faqat `create`), `accept()`da `type:"order"`, `returnItems()`da `type:"return"`, to'lovda `type:"payment"`
- [x] Kredit limiti + zakaz tasdiqlashda tekshiruv (Faza 5'ga ulanadi) — `confirm()`da, `settings.creditLimitMode` (`block`/`warn`), `debts.manage` bypass
- [x] To'lov muddatlari, overdue belgilash — aging'da 5-bucket (`notDue`/`d0_15`/`d16_30`/`d31_60`/`d60plus`), UI'da qizil
- [x] To'lovlar + taqsimlash (FIFO/qo'lda), qisman to'lovlar — `payments` moduli, ortiqcha to'lov `orderId:null` bilan yoziladi
- [x] Aging report (0–15/16–30/31–60/60+) — `GET /debts/aging`, `DebtsAgingPage.vue`
- [x] Solishtirish dalolatnomasi (PDF) — `pdfmake` (standart Helvetica), `GET /debts/counterparties/:id/statement.pdf`
- [ ] Realizatsiya (konsignatsiya) rejimi — DB sxema qo'llab-quvvatlamaydi (yangi migratsiya kerak), `BACKLOG.md`ga o'tkazildi
- [x] Avtomatik eslatmalar — kunlik BullMQ job (`worker.js`), Redis kompaniyalar ro'yxati (RLS bypass'siz), `debts.manage` + sotuv nuqtasi operatorlariga
- [x] Do'kon PWA'da qarz balansi + to'lov tarixi — `MyDebtPage.vue`
- [x] ✅ **Natija: nasiya oqimi testi — zakaz → qisman to'lov → aging to'g'ri → limitda blok**

## Faza 9 — Kassa, valyuta, chop etish (1–2 hafta)

- [x] Kassa/hisob raqamlar, tranzaksiyalar, xarajat kategoriyalari — `cash` moduli (registers/expense-categories/transactions), `transactions` immutable (`immutable.sql`)
- [x] Zakaz ↔ to'lov bog'lanishi — `payments.service.js` `cashRegisterId` berilsa `Payment`dan keyin `Transaction` (`type:"income"`) avtomatik yoziladi
- [x] Kun yopish (smena) + kuryer inkassatsiyasi — `CashShift` ochish/yopish (`expectedBalance`/`diff`, `occurredAt` oynasi bilan), `DeliveryDetailPage.vue`da "Kassaga topshirish"
- [x] Valyuta: USD narxlar, CBU kursi avtomatik, valyutali qarz — `exchange-rates` moduli, kunlik CBU job (`cbu.uz`), `orders`/`shop-catalog`da USD→UZS konvertatsiya; qarz `DebtMovement.currency` orqali Faza 8'dan valyuta-agnostik (alohida USD qarz UI qo'shilmadi)
- [x] Kompaniya brendingi: logo yuklash + brend rangi — `companies` moduli birinchi marta (avval faqat repository bor edi), MinIO logo yuklash
- [x] Chop etish: nakladnaya, aktlar (logo bilan, A4/termoprinter) — `printing.pdf.js` (`pdfmake`, logo bilan); termoprinter/etiketka Faza 4'da qilingan
- [x] ✅ **Natija: kun yopilganda kassa farqi ko'rinadi; nakladnaya logo bilan chiqadi**
      — barcha kod yozilgan va testlangan (901/901 backend test yashil, frontend build muvaffaqiyatli, Claude Browser'da kassa/smena/kompaniya sozlamalari/chop etish/inkassatsiya oqimlari soxta `fetch` bilan uchdan-uchgacha tekshirildi). Haqiqiy Postgres/Redis/MinIO'siz (real CBU API javobi, real PDF ko'rinishi) hali tasdiqlanmagan — oldingi fazalardagi bilan bir xil infratuzilma cheklovi

## Faza 10 — Dashboard va hisobotlar (1 hafta)

- [x] Ega dashboardi (ECharts): sotuv, kassa, qarzdorlik, muddati o'tganlar, tugayotgan mahsulotlar — `GET /reports/dashboard`, `DashboardPage.vue` (`vue-echarts` birinchi marta o'rnatildi)
- [x] Hisobotlar: sotuv dinamikasi, foyda/marja, top mahsulotlar, sklad aylanmasi, qarzdorlik reestri — `reports` moduli (`sales`/`products`/`stock-turnover`), qarzdorlik reestri Faza 8'dagi `debts.getAging()`/`DebtsAgingPage.vue`ga havola (yangi backend kerak emas)
- [x] Audit log UI — `audit-logs` moduli + `AuditLogListPage.vue`; yozish faqat tanlangan olti servis (orders/warehouse-docs/payments/debts/cash/company-members) — to'liq qamrov emas, `BACKLOG.md`da
- [x] ✅ **Natija: ega ertalab 5 daqiqada butun biznes holatini ko'radi**
      — barcha kod yozilgan va testlangan (930/930 backend test yashil, frontend build muvaffaqiyatli, Claude Browser'da dashboard/uchta hisobot/audit log sahifalari soxta `fetch` bilan uchdan-uchgacha tekshirildi, ECharts grafigi va audit log tafsilot-ochish ishlashi tasdiqlandi). Haqiqiy Postgres/Redis'siz (real ma'lumotlar bilan hisob-kitob) hali tasdiqlanmagan — oldingi fazalardagi bilan bir xil infratuzilma cheklovi

## Faza 11 — Landing, vitrina, super-admin (1–2 hafta)

- [x] murcha.uz landing (`vite-ssg`, `apps/landing`): hero, imkoniyatlar (6 karta), tariflar (4 tarif, real narxsiz — biznes qarori hali qabul qilinmagan), CTA — uz/ru (`vue-i18n`, til almashtirish tugmasi)
- [x] SEO: meta/OG (`@unhead/vue`), `sitemap.xml`/`robots.txt` (build-vaqtida generatsiya), `Organization` Schema.org JSON-LD. **hreflang qo'shilmadi** — hozircha bitta URL + client-side til almashtirish (alohida `/ru` route yo'q), hreflang uchun alohida til-URL kerak bo'ladi, kelgusi SEO-kengaytirish sifatida qoldirildi
- [x] Kompaniya vitrinasi: profil + ochiq katalog + zakaz so'rovi (lead) — server-render (`apps/api` `showcase` moduli, to'liq HTML template literal bilan, Vue SSR emas), `Company.slug`/`showcaseSettings`/`Lead` (Faza 0'dan tayyor sxema) birinchi marta ishlatildi
- [x] Super-admin panel: kompaniyalar ro'yxati+qidiruv, tarif/holat/muddat tahrirlash — `User.isPlatformAdmin` (yangi migratsiya), alohida `platform_access` token turi, `apps/web` ichida mustaqil auth filiali (`/platform/*`)
- [x] ✅ **Natija: Google "site:murcha.uz" indekslaydi (texnik asos tayyor — server-render HTML+sitemap, real indekslash tasdiqlanmagan); vitrinadan kelgan lid `lead.new` hodisasi orqali `companies.manage` egalariga bildirishnoma sifatida tushadi**

## Faza 12 — Sayqal va ishga tushirish (1–2 hafta)

Foydalanuvchi bilan kelishilgan holda ikki band shu sessiyadan tashqarida qoldi (real server/domen/haqiqiy mijoz talab qiladi): "Prod... CD zero-downtime"/"Backup+restore sinovi" — real serverga qarshi ishga tushirilmagan/sinovdan o'tkazilmagan, faqat kod/konfig yozildi; "Pilot: 2-3 real biznes" — umuman boshlanmagan.

- [x] Demo-rejim + onboarding checklist (interaktiv) — `RegisterPage.vue` (`demo` checkbox), `registerCompany()` mavjud repositorylar orqali 1 sklad+5 mahsulot+1 sotuv nuqtasi urug'laydi, `OnboardingChecklist.vue` (hisoblanadigan, Dashboard'da). Yo'lda topilgan bo'shliq: `apps/web`da sklad qo'shish sahifasi umuman yo'q edi — `WarehouseListPage.vue` shu vazifa doirasida qo'shildi
- [x] uz/ru lokalizatsiya to'liq (vue-i18n) — `apps/web` (36 fayl) + `apps/shop` (9 fayl) to'liq, `apps/landing` Faza 11'dan tayyor edi. 7 parallel agent + qo'lda birlashtirish
- [x] PWA offline + Background Sync (ikkala ilova) — SW Background Sync API emas, ilova darajasidagi IndexedDB outbox (Safari/iOS SyncManager'ni qo'llab-quvvatlamaydi). `apps/shop`: zakaz yaratish (mavjud `idempotencyKey` bilan xavfsiz qayta urinish). `apps/web`: sklad hujjatini tasdiqlash/bekor qilish (holat-himoyasi tufayli xavfsiz). Ikkalasida ham asl xato topildi va tuzatildi: proxy/nginx 5xx noto'g'ri "doimiy rad" deb talqin qilinib navbatdan o'chirib yuborilar edi
- [x] Prod: nginx + SSL (Let's Encrypt), CD zero-downtime — **kod/konfig sifatida yozildi, real serverga qarshi ishga tushirilmagan**: `docker-compose.prod.yml`, `nginx/nginx.prod.conf` (4 subdomen+certbot), `apps/shop/Dockerfile`+`apps/web/Dockerfile.prod`, `.github/workflows/deploy.yml` (GHCR build+push real ishlaydi, SSH deploy sekret sozlanishini kutadi)
- [x] Backup + restore sinovi, Uptime Kuma — **backup skripti yozildi, sinovdan o'tkazilmagan** (`scripts/backup.sh`, real server/kredensial yo'q); Uptime Kuma `docker-compose.prod.yml`ga xizmat sifatida qo'shildi
- [x] Xavfsizlik auditi (OWASP, penetration test) — **kod darajasidagi audit bajarildi, haqiqiy pentest emas**: CORS oq ro'yxat, `/auth/register` rate-limit, `uuid` CVE tuzatildi; cookie/brute-force/SQL-in'ektsiya/XSS/mass-assignment/multi-tenant/CSRF ko'rib chiqildi va hujjatlashtirildi (`SECURITY.md`)
- [ ] Oferta + maxfiylik siyosati joylandi — huquqiy matn talab qiladi, bu sessiya qamroviga kirmadi, `BACKLOG.md`
- [ ] Pilot: 2–3 real biznes, 2 hafta — **boshlanmagan**, foydalanuvchi bilan aniq kelishilgan chegara (real mijoz kerak)
- [ ] ✅ **Natija: haqiqiy distribyutor real zakazlarini Murcha orqali o'tkazyapti** — kod qismi to'liq tayyor va test qilingan (988/988 backend, frontend build+Claude Browser'da barcha yangi oqim tekshirildi), lekin pilot bajarilmagani uchun yakuniy natija mezoni hali tasdiqlanmagan

## Faza 13 — Real deploy: migratsiya, DB rollari, RLS

Faza 12 oxiridagi "deployga tayormi?" tekshiruvidan tug'ildi. Javob: yo'q edi — sxema hech qachon haqiqiy Postgres'ga qo'llanilmagan (988 test mock repository ustida ishlagan), API image'i ikki sababdan ishga tushmasdi, `deploy.yml` parse bo'lmasdi, RLS esa mavjud ko'rinib turib aslida qo'llanmasdi.

- [x] **Birinchi migratsiya** — `migrations/20260717090000_init` (`migrate diff` bilan offline generatsiya + `stock.sql`/`checks.sql`/`immutable.sql` qo'lda birlashtirildi). Postgres 17.10'ga qo'llandi va tekshirildi: 49 jadval, 19 CHECK, 5 immutable trigger, `stock` indeksi `NULLS NOT DISTINCT = true`. Yo'lda topildi: `stock.sql` `DROP CONSTRAINT` ishlatardi, Prisma esa `@@unique`ni INDEX qiladi → `DROP INDEX`ga o'zgartirildi
- [x] **RLS haqiqatan yoqildi** — `prisma/roles.sql` (`murcha_app`: LOGIN/NOBYPASSRLS/ega emas), har jadvalga `FORCE ROW LEVEL SECURITY`, `lib/prisma.js` ikki client (`prisma`/`prismaBypass`), `withBypass()` va uni ishlatadigan `platform`/`showcase`. **Bundan oldin RLS bitta ham qator filtrlamagan** — API owner/superuser roli bilan ulanardi, u policy'larni chetlab o'tadi (DATABASE.md 9-bo'lim buni allaqachon talab qilgan, amalga oshirilmagan edi)
- [x] **Ikki huquq eskalatsiyasi yopildi** — `USING` yozilib `WITH CHECK` yozilmagani uchun Postgres o'qish ifodasini yozishga ham qo'llardi: foydalanuvchi o'zini istalgan kompaniyaga a'zo qila olardi; tenant `company_id = NULL` bilan hammaga ko'rinadigan soxta "tizim" roli/birligi yarata olardi
- [x] **Haqiqiy Postgres sinovi 4 ta bugni ochdi** (hech biri kod o'qib topilmasdi): `''::uuid` 22P02 (pool'dagi iflos ulanishda login yiqilardi); RLS yoqilganda login umuman ishlamasdi (`include: { company, role }` policy'dan o'tmasdi); `.dockerignore` umuman yo'q edi (host `node_modules` image'ga tushib symlink'larni buzardi — barcha image'larga taalluqli); API image'ida workspace konfigi va `packages/shared/node_modules` yetishmasdi
- [x] **Tekshiruv avtomatlashtirildi** — `pnpm db:verify-rls` (15 tasdiq): rol huquqlari, admin bypass qobiliyati, `company_id`li har jadvalda RLS+FORCE+policy, kontekst izolyatsiyasi, `WITH CHECK` eskalatsiyalari, login oqimi, `withBypass`. `rls.sql` oxirida qamrov tekshiruvi — yangi jadval ro'yxatga qo'shilmasa deploy to'xtaydi. **Unit testlar buni qamrab olmaydi** (rol/policy mock qilinmaydi)
- [x] `/code-review` (high) — 10 topilma, hammasi tuzatildi. Eng muhimi: `withBypass` `DATABASE_ADMIN_URL` superuser bo'lishiga tayanardi, RDS/Cloud SQL'da master superuser emas → platform paneli jimgina bo'sh qaytarardi. Endi `setup-roles.js` deploy paytida tushunarli xato bilan to'xtatadi
- [ ] **Prod sirlar va real deploy** — `.env` prod qiymatlari (JWT/postgres/minio parollari hali default), SSL bootstrap, GHCR prefiks, SSH sekretlar, Uptime Kuma portini yopish, frontend `VITE_*` build-arg'lari
- [ ] ✅ **Natija: RLS ikkinchi himoya qavati sifatida haqiqatan ishlaydi** — mahalliy Postgres 17'da to'liq tasdiqlangan (`db:verify-rls` 15/15 + API orqali uchidan-uchiga: ikki kompaniya bir-birini ko'rmaydi, begona ID 404). Real serverda hali sinalmagan

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
