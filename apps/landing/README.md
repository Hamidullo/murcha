# @murcha/landing

murcha.uz marketing sayti — Vue + `vite-ssg` (statik, server-render HTML), uz/ru (`vue-i18n`), SEO (meta/OG/`Organization` JSON-LD, `sitemap.xml`/`robots.txt`).

```
pnpm --filter @murcha/landing dev      # localhost:5175
pnpm --filter @murcha/landing build    # dist/ + sitemap.xml/robots.txt
pnpm --filter @murcha/landing preview
```

Deploy: `Dockerfile` (statik build + nginx, `docker-compose.yml`dagi `landing` servisi, port 4173). Haqiqiy `murcha.uz` domen-asosli routing (subdomen ajratish) — Faza 12.
