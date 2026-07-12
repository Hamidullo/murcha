# @murcha/web

Sklad/ega/buxgalter ilovasi + kuryer ekrani. Vue 3.5 (`<script setup>`) + Vite + Tailwind 4 + shadcn-vue (kod sifatida, `src/components/ui/`) + Pinia + TanStack Query (vue-query) + Vue Router.

```
pnpm --filter @murcha/web dev
```

Auth oqimi (`/login` → `/select-company` → `/`) `packages/shared` Zod sxemalaridan foydalanadi. Access token faqat Pinia store'da (xotirada) — refresh token httpOnly cookie orqali backend boshqaradi.
