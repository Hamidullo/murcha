# MURCHA

Universal sklad boshqaruvi va B2B zakaz platformasi (murcha.uz).

- To'liq reja: [PLAN.md](PLAN.md)
- DB sxema: [DATABASE.md](DATABASE.md)
- Bajarilish holati: [CHECKLIST.md](CHECKLIST.md)
- Joriy faza vazifalari: [TASKS.md](TASKS.md)
- Kod konventsiyalari: [CLAUDE.md](CLAUDE.md)

## Tuzilma

```
apps/web       — sklad/ega/buxgalter ilovasi + kuryer ekrani
apps/shop      — do'kon B2B zakaz PWA
apps/landing   — murcha.uz marketing sayti
apps/api       — Express API
packages/shared — Zod sxemalar, umumiy tiplar
packages/ui     — umumiy Vue komponentlar
```

## Ishga tushirish (dev)

```
pnpm install
pnpm lint
```

### Docker Compose

```
cp .env.example .env
docker compose up --build
```

- `web` → http://localhost:5173 (hozircha statik placeholder sahifa)
- `nginx` → http://localhost (web'ga proxy), `/api/` → api'ga proxy
- `minio console` → http://localhost:9001
- `api` → http://localhost:3000/healthz (DB + Redis holatini tekshiradi)
- `worker` — hozircha placeholder (console.log qilib chiqadi); haqiqiy BullMQ ishlovchilar tegishli fazalarda qo'shiladi
- Prisma sxema tayyor (`apps/api/prisma/schema.prisma`), lekin birinchi migratsiya hali qo'llanilmagan — Postgres ulangach `apps/api/prisma/README.md`dagi tartibni bajaring

### API'ni Docker'siz ishga tushirish (dev)

```
pnpm --filter @murcha/api start   # http://localhost:3000/healthz
pnpm --filter @murcha/api test    # Vitest + Supertest
```

### Dizayn skill'lar (Claude Code)

O'rnatilgan fayllar `.claude/skills/`/`.agents/skills/` — absolyut symlink ishlatgani
uchun **commit qilinmaydi** (`.gitignore`), faqat `skills-lock.json` commit qilinadi.
Yangi clone'da/mashinada bir marta ishga tushiring:

```
npx impeccable install     # Impeccable — 24 dizayn buyruq (/polish, /audit, /critique...)
npx skills experimental_install   # skills-lock.json'dagi hammasi: taste-skill (13) + emilkowalski animatsiya skill'i (5)
```

`/impeccable init` — birinchi marta PRODUCT.md/DESIGN.md yaratish uchun (auditoriya,
brend, ranglar). Graphify alohida o'rnatilmaydi — global skill sifatida allaqachon
mavjud, `/graphify` bilan chaqiriladi (natija `graphify-out/`, commit qilinmaydi).
