# MURCHA — kod konventsiyalari

Reja: [PLAN.md](PLAN.md) · DB sxema: [DATABASE.md](DATABASE.md) · Bajarilish: [CHECKLIST.md](CHECKLIST.md) · Joriy faza vazifalari: [TASKS.md](TASKS.md)

## Stack

Vue 3.5 (Composition API, `<script setup>`) + JavaScript (TS emas, JSDoc bilan) + Vite · TailwindCSS 4 + shadcn-vue · Node 22 + Express 5 (ES modules) · Prisma + PostgreSQL 17 · Redis + BullMQ · Socket.IO · pnpm workspaces.

## Monorepo tuzilishi

```
apps/web       — sklad/ega/buxgalter ilovasi + kuryer ekrani (Vue SPA/PWA)
apps/shop      — do'kon B2B zakaz PWA (shop.murcha.uz), apps/webdan mustaqil, yengil
apps/landing   — murcha.uz marketing sayti (vite-ssg, statik)
apps/api       — Express API, ikkala ilova uchun bitta backend
packages/shared — Zod sxemalar, umumiy tiplar/konstantalar
packages/ui     — umumiy Vue komponentlar (dizayn-tizim, apps/web va apps/shopda bir xil)
```

## Backend qatlam qoidasi (SOLID)

Har modul (`apps/api/src/modules/<nomi>/`) bir xil qolipda:

```
orders.routes.js       — endpoint ro'yxati, faqat marshrut
orders.controller.js   — HTTP qatlam: request → DTO → service → response
orders.service.js      — BIZNES LOGIKA (bu yerda qaror qabul qilinadi)
orders.repository.js   — faqat DB so'rovlari (Prisma shu yerda, boshqa joyda emas)
orders.schemas.js      — Zod DTO'lar (packages/shared'dan qayta ishlatiladi)
orders.test.js         — unit testlar (service, repository mock bilan)
```

Qat'iy qoida: **controller Prisma'ni to'g'ridan-to'g'ri chaqirmaydi**, faqat service orqali. Service konkret repository klassiga emas, interfeysga bog'lanadi (dependency injection — konstruktor orqali); testda mock repository qo'yiladi. Yangi modul yozganda — mavjud modulni namuna qilib nusxa uslubida yoziladi (papka tuzilishi, fayl nomlari, qatlam tartibi bir xil bo'ladi).

Domen hodisalari (`order.confirmed`, `payment.received`...) EventEmitter/BullMQ orqali tarqaladi — modullar bir-biriga to'g'ridan-to'g'ri bog'lanmaydi. Xatolar — yagona `AppError` ierarxiyasi (`ValidationError`, `NotFoundError`, `InsufficientStockError`...) → bitta error-handler middleware.

## Frontend qatlam qoidasi

Sahifa → composable (`useOrders()` — logika, TanStack Query bilan) → API klient qatlami. Komponentlar faqat ko'rsatadi, biznes logika composable'da.

## Ma'lumotlar yaxlitligi

- Qoldiq/qarz o'zgarishi — faqat `stock_movements`/`debt_movements` immutable jurnal orqali (to'g'ridan-to'g'ri UPDATE yo'q)
- Chiqim/rezerv — `SELECT ... FOR UPDATE` bilan tranzaksiyada, manfiy qoldiq DB CHECK bilan taqiqlangan
- Tasdiqlangan hujjat o'zgarmaydi — tuzatish faqat storno (bekor qilish hujjati) orqali
- Multi-tenant: har so'rov Prisma `$transaction` ichida `set_config('app.company_id', ...)` bilan boshlanadi (RLS himoyasi ikkinchi qavat)

## JSDoc uslubi

TypeScript yo'q, lekin muharrirda avtoto'ldirish TS'dagidek ishlashi uchun funksiya imzolari JSDoc bilan yoziladi:

```js
/**
 * @param {string} companyId
 * @param {import('./orders.schemas.js').CreateOrderDto} dto
 * @returns {Promise<import('@murcha/shared').Order>}
 */
async function createOrder(companyId, dto) { ... }
```

Faqat imzo va murakkab tip kerak bo'lganda yoziladi — o'z-o'zidan tushunarli koddan tashqari izoh yozilmaydi.

## Git workflow

- Himoyalangan `main` + har vazifaga alohida feature branch
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- Merge sharti: CI yashil + `/code-review` o'tgan
- **Definition of Done (har vazifa)**: testlar + lint yashil · `/code-review` o'tdi · qo'lda demo qilindi · `CHECKLIST.md`/`TASKS.md` yangilandi. To'rttasi bajarilmaguncha vazifa yopilmaydi

## Ish uslubi (AI-sessiya)

Bitta sessiya = bitta vazifa (`TASKS.md`dagi bitta band) = bitta PR (~1–3 soat, 3–10 fayl). Faza katta bo'lsa ham, hech qachon "butun faza" bitta sessiyada yozilmaydi. Murakkab joylar (RLS, qoldiq tranzaksiyasi, qarz jurnali) — avval plan-rejimda yechim kelishiladi, keyin yoziladi. Yangi g'oya MVP scope'dan tashqarida bo'lsa — `BACKLOG.md`ga, kodga emas.

## Lint/format

```
pnpm lint          # ESLint butun monorepo
pnpm format        # Prettier yozadi
pnpm format:check  # CI uchun
```
