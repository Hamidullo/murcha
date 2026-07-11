# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 1 — Auth va kompaniya

- [x] **Task 1 — Auth fondamenti**: RLS tuzatish (`company_members` — `user_id` orqali o'z a'zoligini ko'rish), `tenant-context.js` kengaytirish (`withTenant(companyId, userId, cb)` + `withUserContext(userId, cb)`), argon2 parol util, JWT (access token) util, `users`/`companies`/`company-members` repository qatlami + testlar
- [x] **Task 2 — Ro'yxatdan o'tish**: Zod schemas (`packages/shared`), `auth.service.js` (`registerCompany()` — user+company+company_member(owner)+subscription bitta tranzaksiyada), `POST /api/v1/auth/register`, `validate()` middleware
- [x] **Task 3 — Login + kompaniya tanlash**: `withoutTenant()` qo'shildi (global `users` uchun), `POST /auth/login` (bitta kompaniya → to'g'ridan access token, ko'p bo'lsa → `pendingToken`+ro'yxat), `POST /auth/select-company` (`pendingToken`+`companyId` → access token)
- [x] **Task 4 — Refresh token rotation + sessiyalar**: `SessionsRepository` (Redis: `session:*`/`refresh:*`/`user_sessions:*`), httpOnly cookie (`murcha_rt`, path `/api/v1/auth`), `POST /auth/refresh` (rotation + reuse detection — mos kelmasa sessiya darhol bekor), `POST /auth/logout`, `GET/DELETE /auth/sessions`. register/login/select-company endi avtomatik sessiya ochadi
- [x] **Task 5 — RBAC middleware**: `requireAuth` (`Authorization: Bearer` → `req.auth`), `requirePermission(code)` (`role_permissions` orqali), `RolesRepository.hasPermission`/`CompaniesRepository.findById` qo'shildi, `GET /api/v1/auth/me` (birinchi `requireAuth`bilan himoyalangan endpoint, namuna)
- [x] **Task 6 — Rate-limit + brute-force himoya**: `rateLimit()` (IP bo'yicha, Redis INCR+EXPIRE, login'da 20/5daq), `LoginAttemptsRepository` (telefon bo'yicha, 5 xato urinishdan keyin 15 daq blok — `AuthService.login()` ichida)

Faza 1 "Natija" mezoni (CHECKLIST.md): kompaniya ochib kirib-chiqib bo'ladi; ikkinchi kompaniya ma'lumoti ko'rinmaydi (RLS izolyatsiya testi).
