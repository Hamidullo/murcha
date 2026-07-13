# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 11 — Landing, vitrina, super-admin

`Company.slug`/`showcaseSettings`, `Lead`, `Subscription` modellari Faza 0'dan tayyor, lekin hech qayerda ishlatilmagan. Platform-admin konsepsiyasi kod bazasida umuman yo'q edi. Arxitektura qarorlari (vitrina — `apps/api`da yengil HTML-render endpoint, Vue SSR emas; super-admin — alohida token turi + mavjud `apps/web` qobig'ida yangi auth filiali, yangi Docker servis emas; `apps/landing` — `vite-ssg` bilan birinchi marta quriladi; deploy fayllari yoziladi lekin haqiqiy `docker compose up` bilan tekshirilmaydi — infratuzilma cheklovi) — Task 1 boshida plan-rejimda kelishilgan.

- [x] **Task 1 — Vitrina backend**: `showcase` moduli (`findCompanyBySlug`/`listCatalog`/`createLead`, `GET /:slug` HTML render, `POST /:slug/leads`)
- [x] **Task 2 — Super-admin backend**: `User.isPlatformAdmin`, platform token turi, `platform-auth`/`platform` modullari, `create-platform-admin.js`
- [x] **Task 3 — Vitrina frontend sozlamalari (`apps/web`)**: `CompanySettingsPage.vue`ga vitrina bo'limi
- [x] **Task 4 — Super-admin frontend (`apps/web`)**: `usePlatformAuthStore`, `PlatformLoginPage.vue`/`PlatformLayout.vue`/`PlatformCompaniesPage.vue`
- [x] **Task 5 — `apps/landing` skeleton**: `vite-ssg`+Vue+Tailwind+`vue-i18n`
- [x] **Task 6 — `apps/landing` kontent + SEO + deploy**: bosh sahifa, meta/OG, sitemap/robots, Dockerfile+compose+nginx
- [x] **Task 7 — Claude Browser + build tekshiruvi**
- [x] **Task 8 — Test/lint/hujjatlar**

Faza 11 "Natija" mezoni (PLAN.md): Google "site:murcha.uz" indekslaydi; vitrinadan kelgan lid egaga tushadi.

## Faza 12 — Sayqal va ishga tushirish (kod qismi)

PLAN.mgdagi olti banddan to'rttasi shu sessiya qamrovida: demo-rejim+onboarding, to'liq uz/ru lokalizatsiya, PWA offline+background sync, prod deploy konfiglari, xavfsizlik auditi. **Real domenga SSL/CD deploy va 2-3 haqiqiy biznes bilan pilot — foydalanuvchi bilan kelishilgan holda shu sessiyadan tashqarida** (real server/kredensial/mijoz talab qiladi). Arxitektura qarorlari (offline navbat — SW Background Sync emas, ilova darajasidagi IndexedDB outbox, Safari/iOS SyncManager yo'qligi va real qurilmada sinov imkoniyati yo'qligi sababli; outbox helper har ilovada alohida, `packages/shared`ga chiqarilmaydi; i18n — avval infratuzilma, keyin ilova bo'yicha to'liq qamrov; onboarding checklist — hisoblanadigan, yangi DB ustuni yo'q; demo-rejim — mavjud service metodlari orqali urug'lanadi; prod deploy — faqat kod/konfig, ishga tushirilmaydi) — Task 1 boshida plan-rejimda kelishilgan.

- [x] **Task 1 — i18n infratuzilma**: `vue-i18n` `apps/web`+`apps/shop`ga, `apps/landing` namunasi bo'yicha `src/i18n/{index.js,uz.json,ru.json}` + til almashtirgich
- [x] **Task 2 — i18n `apps/web` to'liq**: 36 `.vue` fayl (platform-admin sahifalari chiqarib tashlandi — ichki vosita), `t('key')`ga o'tkazildi, `uz.json`/`ru.json` to'ldirildi (7 parallel agent + qo'lda birlashtirish)
- [x] **Task 3 — i18n `apps/shop` to'liq**: 9 fayl (`t('key')`ga o'tkazildi, `uz.json`/`ru.json` to'ldirildi)
- [x] **Task 4 — Offline outbox `apps/shop`**: `lib/offline-outbox.js` (IndexedDB/`idb`), `CartPage.vue` navbatga qo'yib-flush, Workbox `runtimeCaching`, `ShopLayout.vue`da flush trigger+navbat badge. Claude Browser'da to'liq oqim tekshirildi — offline holatda navbatga tushishi, `online` hodisasida yuborilishi; yo'lda xato topildi va tuzatildi: proxy/nginx 5xx (backend vaqtincha ishlamasa) noto'g'ri "server rad etdi" (4xx) deb talqin qilinib navbatdan o'chirib yuborilar edi — endi faqat 4xx (haqiqiy rad javob) o'chiradi, 5xx/tarmoq xatosi saqlab qoladi
- [x] **Task 5 — Offline outbox `apps/web`**: `sw.js` precaching faollashtirildi (`workbox-precaching`, 74 element), `lib/offline-outbox.js` — sklad hujjatini tasdiqlash/bekor qilish amallari (holat-himoyasi tufayli xavfsiz qayta urinish, yangi backend o'zgarish kerak emas), `AppLayout.vue`da flush trigger+badge. Claude Browser'da to'liq oqim tekshirildi
- [x] **Task 6 — Onboarding**: `RegisterPage.vue`, `registerSchema.demo`, `registerCompany()` demo urug'lash (sklad+5 mahsulot+mijoz+narx turi+sotuv nuqtasi, mavjud repositorylar orqali), `OnboardingChecklist.vue` (hisoblanadigan, Dashboard'ga joylashtirilgan). Yo'lda topilgan bo'shliq: `apps/web`da sklad qo'shish sahifasi umuman yo'q edi (backend CRUD tayyor, frontend yo'q) — `WarehouseListPage.vue` (yaratish+ro'yxat) shu vazifa doirasida qo'shildi, onboarding checklist'ning 1-bosqichi buni talab qiladi. Backend: 989/989 test, apps/web: lint/format toza, build muvaffaqiyatli, Claude Browser'da to'liq ro'yxatdan o'tish→demo bo'lmagan holat→sklad qo'shish→checklist yangilanishi oqimi tekshirildi
- [x] **Task 7 — Prod deploy konfiglari**: `docker-compose.prod.yml` (GHCR image'lariga moslashtirilgan, portlar faqat ichki tarmoqqa), `nginx/nginx.prod.conf` (4 subdomen+SSL+certbot webroot, bootstrap tartibi izohda), `apps/shop/Dockerfile`+`apps/web/Dockerfile.prod` (statik build+nginx, SPA fallback), `.github/workflows/deploy.yml` (GHCR build+push — real ishlaydi; SSH deploy — faqat sekret sozlansa), `scripts/backup.sh` (pg_dump+MinIO mirror+rotatsiya), Uptime Kuma xizmati. YAML sintaksisi tekshirildi (`js-yaml`); real serverga qarshi ishga tushirilmagan/sinovdan o'tkazilmagan (kredensial/server yo'q, foydalanuvchi bilan kelishilgan chegara)
- [x] **Task 8 — Xavfsizlik auditi**: CORS allowlist (`APP_WEB_URL`/`APP_SHOP_URL`/`PUBLIC_BASE_URL`), `/auth/register` rate-limit (haqiqiy muammo — Task 6'da frontend ulandi), `uuid` CVE (`pnpm-workspace.yaml overrides`, `pnpm audit` 0 zaiflik), cookie/CSRF/XSS/SQL-in'ektsiya/mass-assignment/multi-tenant ko'rib chiqildi (`SECURITY.md`). 988/988 backend, lint/format toza, 3 frontend build muvaffaqiyatli. Commit `0d0f735`, push muvaffaqiyatli

Faza 12 (kod qismi) "Natija": demo-rejim bilan yangi kompaniya bir necha soniyada namunaviy ma'lumot bilan sinab ko'radi; `apps/web`/`apps/shop` to'liq uz/ru; ikkala PWA offline'da ishlaydi va aloqa tiklanganda avtomatik sinxronlanadi; prod deploy uchun barcha konfig fayllar tayyor (real ishga tushirish keyingi bosqich).
