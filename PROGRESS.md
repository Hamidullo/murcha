# PROGRESS — haftalik retro

Har hafta oxirida 15 daqiqa: nima bitdi, nima sekin ketdi, keyingi hafta rejasi. 3-4 qator, sana bilan.

---

## 2026-07-11

- Faza 0 boshlandi: PLAN.md/DATABASE.md/CHECKLIST.md asosida `TASKS.md` yozildi
- Task 1 (monorepo skelet + tooling + CLAUDE.md) bajarildi
- Task 2 (Docker Compose: postgres/redis/minio/nginx + api/worker/web Dockerfile skeletlari) bajarildi — mahalliy Docker yo'q, sinov keyinroq
- Task 3 (Prisma sxema — 34 model, RLS/CHECK/immutable SQL, seed) bajarildi — `prisma validate`/`generate` o'tdi, Prisma 7 chiqqan lekin 6.19.3'ga qotirildi (DATABASE.md klassik `datasource url` uslubiga mos); birinchi migratsiya mahalliy Postgres yo'qligi sababli qo'llanilmadi
- Task 4 (Express API skeleti: app/index, /healthz, AppError+xato-handler, withTenant RLS wrapper, qatlam-buzilish ESLint qoidasi) bajarildi — Vitest+Supertest bilan 13 test yashil, server real ishga tushirilib `/healthz` qo'lda ham tekshirildi (DB/Redis yo'qligida to'g'ri 503 "degraded" qaytardi)
- Task 5 (CI: GitHub Actions lint/format/prisma-validate/test + Sentry ulanish) bajarildi — 5/6 Faza 0 vazifasi tugadi, navbatda commit (har 5 taskda)
- Task 1-5 commit qilindi (`d6ba1b9`) — git identity shu sessiyada birinchi marta sozlandi (global: Hamidullo Tuychibaev)
- GitHub repo ulandi (`Hamidullo/murcha`), default branch `master`→`main`ga o'zgartirildi, `gh` CLI o'rnatildi va autentifikatsiyalandi
- Task 6 (Dizayn skill'lar: Impeccable loyiha ichida, taste-skill 13ta + emilkowalski animatsiya 5ta `npx skills` orqali, Graphify birinchi marta ishga tushirildi — 329 tugun/59 hamjamiyat) bajarildi. Skill fayllari o'zi gitignore (absolyut symlink — boshqa mashinada buziladi), faqat `skills-lock.json` commit qilinadi
- **Faza 0 — 6/6 vazifa bajarildi.** Faqat `docker compose up`ning o'zi sinalmagan (mahalliy Docker yo'q) — qolgan hammasi (lint/test/prisma validate/CI/`/healthz`) tekshirildi
- Faza 1 boshlandi: `TASKS.md` 6 vazifaga bo'lindi (plan-rejimda). Task 1 (auth fondamenti) bajarildi:
  - **RLS kashfiyoti**: login oqimida `company_members`ni `user_id` bilan qidirish kerak (company hali tanlanmagan), lekin joriy policy buni 0 qatorga qisqartirar edi → policy'ga `OR user_id = current_setting('app.user_id')` qo'shildi, `withTenant()` `userId` qabul qiladigan qilindi + yangi `withUserContext()`
  - argon2 parol util, JWT (access, 15 daq) util, `users`/`companies`/`company-members` repository qatlami — hammasi test bilan (24/24 test yashil)
  - Hali HTTP endpoint yo'q (Task 2/3'da) — bu sof fondament
- Task 2 (ro'yxatdan o'tish) bajarildi: `packages/shared` Zod sxemasi (`registerSchema`), `validate()` middleware, `auth` moduli (routes/controller/service — DI kompozitsiya ildizi `auth.routes.js`da), `POST /api/v1/auth/register`. ESLint qatlam qoidasi toraytirildi (faqat `*.controller.js`, `*.routes.js` DI ildizi sifatida istisno). 35/35 test yashil, shu jumladan supertest bilan to'liq integratsiya (register → 201/400/409)
- Task 3 (login + kompaniya tanlash) bajarildi: `withoutTenant()` (global `users` jadvali uchun), `POST /auth/login` (bitta a'zolik → to'g'ridan access token; ko'p a'zolik → 5 daqiqalik `pendingToken` + kompaniyalar ro'yxati), `POST /auth/select-company` (`pendingToken`+`companyId` → access token). `jwt.js`: `signAccessToken`/`signPendingToken`/`verifyToken` (payload'da `type` maydoni bilan ajratiladi). 56/56 test yashil (3 task, oxirgi commitdan beri — hali 5taga yetmagan)
- Task 4 (refresh token rotation + sessiyalar) bajarildi: `SessionsRepository` (Redis, opaque refresh token — JWT emas), httpOnly cookie `murcha_rt` (`sessionId.refreshToken`, path `/api/v1/auth`). `POST /auth/refresh` — rotation; token mos kelmasa (reuse/o'g'irlanish belgisi) sessiya darhol bekor qilinadi. `GET/DELETE /auth/sessions`, `POST /auth/logout` — joriy sessiya cookie orqali "kim so'ramoqda" aniqlanadi (hali alohida RBAC/`requireAuth` kerak emas — Task 5'da boshqa domenlar uchun qo'shiladi). register/login/select-company endi avtomatik sessiya ochadi. 85/85 test yashil, real server ishga tushirilib tekshirildi
- Task 5 (RBAC middleware) bajarildi: `requireAuth` (JWT access token → `req.auth = {userId, companyId, roleId}`, business modullar Faza 2+ shundan `withTenant()` chaqiradi), `requirePermission(code)` (`role_permissions` orqali, `withTenant` ichida). `RolesRepository.hasPermission`, `CompaniesRepository.findById` qo'shildi. `GET /api/v1/auth/me` — birinchi `requireAuth` bilan himoyalangan endpoint (namuna + amaliy foyda: frontend token olgach profil so'raydi). 102/102 test yashil
- Foydalanuvchi so'rovi: fazani oxirigacha (Task 6) yetkazib keyin commit+push qilinadi — 5-task qoidasidan bu safar chetga chiqildi
- Task 6 (rate-limit + brute-force himoya) bajarildi: `rateLimit()` middleware (IP bo'yicha, Redis INCR+EXPIRE — login'da 20 so'rov/5 daq), `LoginAttemptsRepository` (telefon bo'yicha, 5 xato urinishdan keyin 15 daqiqa blok, `AuthService.login()` ichida — muvaffaqiyatli login hisobni nolga tushiradi), `TooManyRequestsError` (429). 115/115 test yashil, real server bilan qo'lda tekshirildi
- **Faza 1 — 6/6 vazifa bajarildi.** Barcha auth oqimi (register/login/select-company/refresh/logout/sessions/me/RBAC/rate-limit) yozilgan va mock Prisma/Redis bilan to'liq testlangan. Haqiqiy Postgres'da RLS izolyatsiyasi hali tasdiqlanmagan (mahalliy DB yo'q — Faza 0'dagi bilan bir xil cheklov)
- Keyingi: commit + push (foydalanuvchi so'rovi bo'yicha), so'ng Faza 2 — Mahsulot katalogi
