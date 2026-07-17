# DEPLOY — Murcha prod runbook

Real serverga birinchi marta chiqarish tartibi. Kod tomoni tayyor (Faza 13);
bu yerdagi qadamlar **odam bajaradigan** ishlar — sirlar, DNS, SSL, GitHub
sozlamalari.

Tegishli fayllar: [docker-compose.prod.yml](docker-compose.prod.yml) ·
[nginx/nginx.prod.conf](nginx/nginx.prod.conf) ·
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) ·
[apps/api/prisma/README.md](apps/api/prisma/README.md)

## 0. Talablar

- Ubuntu 22.04+ server, Docker + Compose plugin
- `murcha.uz` DNS: `murcha.uz`, `app`, `shop`, `api` — hammasi server IP'siga A-yozuv
- GitHub repo: `Hamidullo/murcha`

## 1. Postgres qaysi? — birinchi qaror

**Bu qadam o'tkazib yuborilmaydi.** `prisma/rls.sql` `FORCE ROW LEVEL SECURITY`
ishlatadi — u jadval EGASIGA ham qo'llanadi. Faqat `superuser` yoki
`BYPASSRLS` roli chetlab o'ta oladi.

| Variant                                                | Ishlaydimi                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Serverdagi Docker Postgres (`docker-compose.prod.yml`) | ✅ `POSTGRES_USER` superuser                                                                           |
| RDS / Cloud SQL / Neon / Supabase                      | ⚠️ master superuser EMAS — `ALTER ROLE <master> BYPASSRLS;` kerak (provayder ruxsat bermasligi mumkin) |

Boshqarilayotgan Postgres tanlansa va BYPASSRLS berilmasa: super-admin paneli
bo'sh qaytadi, vitrina 404 beradi, seed yiqiladi. `setup-roles.js` buni deploy
paytida ushlaydi va to'xtaydi — lekin qarorni oldindan qilgan afzal.

## 2. Sirlarni generatsiya qilish

Serverda:

```bash
mkdir -p /opt/murcha && cd /opt/murcha
# repo'dan .env.example nusxasini oling, so'ng:
openssl rand -hex 32   # JWT_ACCESS_SECRET
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 24   # MINIO_ROOT_PASSWORD
openssl rand -hex 24   # APP_DB_PASSWORD
```

`/opt/murcha/.env` da to'ldiriladigan **majburiy** qiymatlar:

```ini
POSTGRES_PASSWORD=<yuqoridagi>
MINIO_ROOT_PASSWORD=<yuqoridagi>
JWT_ACCESS_SECRET=<yuqoridagi, 32+ belgi>
GHCR_IMAGE_PREFIX=ghcr.io/hamidullo/murcha

# Ikki DB roli (prisma/roles.sql) — host konteyner nomi `postgres`
DATABASE_URL=postgresql://murcha_app:<APP_DB_PASSWORD>@postgres:5432/murcha?schema=public
DATABASE_ADMIN_URL=postgresql://murcha:<POSTGRES_PASSWORD>@postgres:5432/murcha?schema=public
APP_DB_USER=murcha_app
APP_DB_PASSWORD=<yuqoridagi>

COOKIE_DOMAIN=.murcha.uz
APP_WEB_URL=https://app.murcha.uz
APP_SHOP_URL=https://shop.murcha.uz
PUBLIC_BASE_URL=https://murcha.uz
```

Sozlanmasa nima bo'ladi (ataylab — jim prod'ga chiqmasin):

- `POSTGRES_PASSWORD`/`MINIO_ROOT_PASSWORD`/`GHCR_IMAGE_PREFIX` — compose
  umuman ishga tushmaydi (`:?`)
- `JWT_ACCESS_SECRET` standart yoki 32 belgidan qisqa — API ishga tushmaydi
  (`src/config/env.js`)
- `DATABASE_ADMIN_URL` yo'q — API ishga tushmaydi (`src/lib/prisma.js`)

`chmod 600 .env`.

## 3. GitHub sozlamalari

Repo → Settings → Secrets and variables → Actions:

**Secrets** (SSH deploy uchun; sozlanmasa `deploy` qadami jim o'tkaziladi,
image'lar baribir GHCR'ga push bo'ladi):

- `SSH_HOST`, `SSH_USER`, `SSH_KEY`

**Variables**:

- `VITE_VAPID_PUBLIC_KEY` — VAPID **ochiq** kaliti (`npx web-push
generate-vapid-keys`). Maxfiy emas: brauzerga baribir ketadi. Vite uni build
  vaqtida qotiradi, shuning uchun konteyner env'i emas, build-arg. Sozlanmasa
  Web Push jimgina o'chiq bo'ladi. Maxfiy `VAPID_PRIVATE_KEY` esa faqat
  serverdagi `.env`da.

## 4. SSL bootstrap (bir marta)

Sertifikat yo'q holatda `nginx` 443-blok bilan ishga tushmaydi — tovuq/tuxum.
Tartib [nginx/nginx.prod.conf](nginx/nginx.prod.conf) boshidagi izohda; qisqacha:

```bash
# 1. Faqat 80-port (ACME challenge) bilan nginx ko'taring
# 2. Sertifikat oling:
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d murcha.uz -d app.murcha.uz -d shop.murcha.uz -d api.murcha.uz \
  --email support@murcha.uz --agree-tos
# 3. To'liq konfig bilan qayta ishga tushiring:
docker compose -f docker-compose.prod.yml restart nginx
```

Keyingi yangilashlar avtomatik (`certbot` xizmati ~12 soatda bir tekshiradi).

## 5. Birinchi deploy

`main`ga merge → `deploy.yml` GHCR'ga image quradi va (sekret bo'lsa) serverga
chiqaradi. Qo'lda:

```bash
cd /opt/murcha
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d
```

`migrate` bir martalik xizmat: migratsiya → RLS (+ qamrov tekshiruvi) →
trigram indeks → DB rollari → seed. `api`/`worker` u muvaffaqiyatli
tugagachgina ishga tushadi (poyga yo'q). Hammasi idempotent — har deploy'da
qayta ishlatilaveradi.

## 6. Deploydan keyin tekshirish

```bash
curl -s https://api.murcha.uz/healthz          # {"status":"ok","checks":{"db":true,"redis":true}}
docker compose -f docker-compose.prod.yml exec api pnpm exec node prisma/verify-rls.js
```

RLS tekshiruvi 15/15 bo'lishi kerak. Bu **eng muhim** tekshiruv: multi-tenant
izolyatsiya haqiqatan ishlayaptimi. Unit testlar buni qamrab olmaydi.

Super-admin yaratish (o'z-o'zidan ro'yxatdan o'tish yo'q):

```bash
docker compose -f docker-compose.prod.yml exec api \
  node scripts/create-platform-admin.js +998XXXXXXXXX '<kuchli-parol>'
```

## 7. Monitoring

Uptime Kuma faqat localhost'ga bog'langan (`127.0.0.1:3001`) — internetga
ochiq emas. Kirish:

```bash
ssh -L 3001:localhost:3001 <user>@<server>
# brauzerda: http://localhost:3001
```

## 8. Backup

`scripts/backup.sh` — `pg_dump` + MinIO mirror + rotatsiya. Cron'ga qo'ying.
**Restore hali sinovdan o'tkazilmagan** — birinchi backup'dan keyin bo'sh
bazaga tiklashni bir marta sinab ko'ring (`CHECKLIST.md`).
