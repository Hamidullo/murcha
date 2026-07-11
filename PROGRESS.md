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
- Keyingi: Task 6 — Dizayn skill'lar (Impeccable, taste-skill, animatsiya skill, Graphify)
