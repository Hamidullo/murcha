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
