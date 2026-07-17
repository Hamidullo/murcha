# Prisma — MURCHA

To'liq spetsifikatsiya: [DATABASE.md](../../../DATABASE.md). Sxema: `schema.prisma`.

## Migratsiyalar

Birinchi migratsiya — `migrations/20260717090000_init/migration.sql` (Faza 13).
U `prisma migrate diff --from-empty` bilan generatsiya qilingan, so'ng oxiriga
qo'lda qo'shilgan: `stock.sql` + `checks.sql` + `immutable.sql` (Prisma sxemasi
CHECK/trigger/`NULLS NOT DISTINCT` sintaksisini qo'llab-quvvatlamaydi). Manba
fayllar hujjat sifatida saqlanadi — **migratsiyadagi nusxa haqiqiy qo'llanadi**,
shuning uchun ularni o'zgartirsangiz yangi migratsiya ham yozing.

`rls.sql` va `search.sql` migratsiyadan **tashqarida** qo'llaniladi (Prisma
migrate RLS policy'larni kuzatmaydi) — ikkalasi ham idempotent.

## Lokal ishga tushirish (nol holatdan)

```bash
cp .env.example .env          # DATABASE_URL'ni moslashtiring
docker compose up -d postgres

pnpm db:migrate:deploy        # migrations/ dagi migratsiyalarni qo'llaydi
pnpm db:rls                   # RLS policy'lar (+ FORCE)
pnpm db:search                # pg_trgm + GIN indeks
pnpm db:roles                 # `murcha_app` roli (NOBYPASSRLS) — migratsiyadan KEYIN
pnpm db:generate              # Prisma Client
pnpm db:seed                  # tizim rollari/ruxsatlari/birliklari

pnpm db:verify-rls            # RLS izolyatsiyasi haqiqatan ishlayaptimi
```

Tartib muhim: `db:roles` GRANT'ni MAVJUD jadvallarga beradi, shuning uchun
migratsiyadan keyin turadi. `db:seed` tizim qatorlarini (`company_id = NULL`)
owner roli bilan yozadi — `rls.sql`dagi `WITH CHECK` buni tenant roliga
taqiqlaydi.

## RLS tekshiruvi

`pnpm db:verify-rls` — `murcha_app` roli nomidan izolyatsiyani tekshiradi
(kontekstsiz o'qish, begona kontekst, `WITH CHECK` eskalatsiyalari, login
oqimi). Unit testlar buni QAMRAB OLMAYDI: rol huquqi va policy xatti-harakati
mock qilinmaydi. Sxema/RLS o'zgartirilsa shu skript qayta ishga tushirilsin.

## Production

`docker-compose.prod.yml`dagi bir martalik `migrate` xizmati aynan shu to'rt
qadamni bajaradi (`migrate deploy` → `rls.sql` → `search.sql` → `seed.js`),
`api`/`worker` esa `service_completed_successfully` sharti bilan undan keyin
ishga tushadi — ikkala konteyner bir vaqtda migratsiya qilishga urinmaydi.

## Keyingi migratsiyalar

Expand-contract (CLAUDE.md): `pnpm db:migrate` (`migrate dev`) yangi migratsiya
yozadi. `checks.sql`/`immutable.sql`ga yangi qoida qo'shilsa — uni ham yangi
migratsiya fayliga qo'lda ko'chiring.

> Eslatma: `stock` unique indeksi `NULLS NOT DISTINCT` bilan yaratilgan, buni
> Prisma sxemada ifodalay olmaydi — `migrate dev` shu bo'yicha drift ogohlantirishi
> berishi mumkin. Ogohlantirish kutilgan, indeksni "tuzatish"ga ruxsat bermang.

## Fayllar

- `schema.prisma` — modellar (DATABASE.md asosida)
- `migrations/` — qo'llanadigan migratsiyalar (haqiqiy manba)
- `checks.sql` — CHECK cheklovlar ro'yxati (init migratsiyaga ko'chirilgan)
- `immutable.sql` — immutable jurnal trigger'lari (init migratsiyaga ko'chirilgan)
- `stock.sql` — `stock` unique indeksini NULLS NOT DISTINCT qiladi (init migratsiyaga ko'chirilgan)
- `rls.sql` — Row-Level Security policy'lar (alohida qo'llaniladi, idempotent)
- `search.sql` — `pg_trgm` kengaytma + GIN indeks (alohida qo'llaniladi, idempotent)
- `seed.js` — tizim rollari/ruxsatlari/birliklari (idempotent, upsert)
