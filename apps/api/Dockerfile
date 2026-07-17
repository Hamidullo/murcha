# Root kontekstdan quriladi (pnpm monorepo lockfile kerak):
#   docker build -f apps/api/Dockerfile .
# Kontekstdan nima chiqarilishi — `.dockerignore` (ayniqsa `node_modules`:
# host'niki ko'chirilsa `deps` bosqichidagi symlink'lar ustiga yozilardi).

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile --filter=@murcha/api...

FROM base AS runner
ENV NODE_ENV=production

# Avval manba kod, keyin node_modules — teskari tartibda manba nusxasi
# bog'liqliklar ustiga yozilib ketishi mumkin.
# Workspace konfiguratsiyasi `pnpm exec` uchun kerak: usiz pnpm
# `@murcha/shared@workspace:*`ni yecholmaydi (ERR_PNPM_WORKSPACE_PKG_NOT_FOUND).
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/api ./apps/api

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
# `@murcha/shared`ning O'Z bog'liqliklari (zod...) — `packages` kontekstdan
# keladi va `.dockerignore` node_modules'ni chiqarib tashlagan, shuning uchun
# ular alohida ko'chiriladi.
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules

WORKDIR /repo/apps/api
# Prisma Client generatsiya qilinmasa `new PrismaClient()` ishga tushishda xato
# beradi — sxema shu bosqichda mavjud, shuning uchun bu yerda chaqiriladi.
RUN pnpm exec prisma generate

CMD ["node", "src/index.js"]
