# TASKS — joriy faza vazifalari

> Har faza boshida shu fayl qayta yoziladi (PLAN.md 8.0). Bitta sessiya = bitta vazifa = bitta PR.

## Faza 0 — Skelet va infratuzilma

- [x] **Task 1 — Monorepo skelet + tooling**: pnpm workspaces, ESLint/Prettier/JSDoc, `.gitignore`, `CLAUDE.md`, `BACKLOG.md`/`PROGRESS.md`, git init
- [x] **Task 2 — Docker Compose infra**: postgres, redis, minio, nginx, api/worker/web Dockerfile skeletlari
- [x] **Task 3 — Prisma sxema**: DATABASE.md asosida to'liq sxema (`schema.prisma` — 34 model) + RLS/CHECK/immutable SQL + seed data yozildi va tekshirildi (`prisma validate`/`generate`). Birinchi migratsiya — Postgres ulanganda (`prisma/README.md`dagi tartib bo'yicha)
- [x] **Task 4 — Express API skeleti**: app bootstrap (`app.js`/`index.js`), pino log, `/healthz` (DB+Redis), `AppError` ierarxiyasi + xato-handler middleware, `withTenant` RLS wrapper, qatlam-buzilish ESLint qoidasi, Vitest+Supertest (13 test yashil)
- [x] **Task 5 — CI**: GitHub Actions (`.github/workflows/ci.yml` — lint/format/prisma validate/test har push va PR) + Sentry ulandi (`SENTRY_DSN` bo'sh bo'lsa o'chiq)
- [ ] **Task 6 — Dizayn skill'lar**: Impeccable, taste-skill, animatsiya skill, Graphify o'rnatiladi

Faza 0 "Natija" mezoni (CHECKLIST.md): `docker compose up` → bo'sh ilova ochiladi, API `/healthz` javob beradi, CI yashil.
