# Prisma — MURCHA

To'liq spetsifikatsiya: [DATABASE.md](../../../DATABASE.md). Sxema: `schema.prisma`.

## Birinchi migratsiya (Postgres ulanganda bir marta qilinadi)

Bu sessiyada Docker/Postgres mahalliy mavjud emas edi, shuning uchun migratsiya
hali yaratilmagan/qo'llanilmagan — faqat `schema.prisma` yozilgan va
`prisma validate`/`prisma generate` bilan tekshirilgan (DB shart emas).

Postgres ulangach (`docker compose up -d postgres` yoki boshqa Postgres 17):

```bash
cp .env.example .env   # DATABASE_URL'ni moslashtiring

# 1. Migratsiyani generatsiya qilish, lekin QO'LLAMASDAN (CHECK/immutable qo'shish uchun)
pnpm db:migrate -- --create-only --name init

# 2. Generatsiya qilingan migration.sql'ga qo'shish:
#    - prisma/checks.sql — CHECK cheklovlar (enum o'rniga)
#    - prisma/immutable.sql — stock_movements/debt_movements/audit_logs/
#      order_status_history uchun UPDATE/DELETE taqiqi (trigger)
#    (ikkalasini ham migration.sql oxiriga qo'shib qo'ying)

# 3. Migratsiyani qo'llash
pnpm db:migrate

# 4. RLS policy'lar (migratsiyadan alohida — Prisma migrate RLS'ni yaxshi kuzatmaydi)
pnpm db:rls

# 5. Seed (tizim rollari/ruxsatlari/birliklari)
pnpm db:generate   # client generatsiya (migratsiyadan keyin ham xavfsiz)
pnpm db:seed
```

Keyingi migratsiyalar (expand-contract, CLAUDE.md): oddiy `pnpm db:migrate`
yetarli, checks/rls fayllariga yangi qoida qo'shilsa alohida qo'llaniladi.

## Fayllar

- `schema.prisma` — modellar (DATABASE.md asosida)
- `checks.sql` — CHECK cheklovlar ro'yxati (birinchi migratsiyaga qo'lda qo'shiladi)
- `immutable.sql` — immutable jurnal trigger'lari
- `rls.sql` — Row-Level Security policy'lar (DATABASE.md 9-bo'lim)
- `seed.js` — tizim rollari/ruxsatlari/birliklari
