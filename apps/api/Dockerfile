# Root kontekstdan quriladi (pnpm monorepo lockfile kerak):
#   docker build -f apps/api/Dockerfile .

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
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
# Manba kod kontekstdan olinadi — `deps` bosqichida faqat package.json'lar bor
# (workspace symlink `node_modules/@murcha/shared` shu papkaga ko'rsatadi).
COPY packages ./packages
COPY apps/api ./apps/api
WORKDIR /repo/apps/api
# Prisma Client generatsiya qilinmasa `new PrismaClient()` ishga tushishda xato
# beradi — sxema shu bosqichda mavjud, shuning uchun bu yerda chaqiriladi.
RUN pnpm exec prisma generate

CMD ["node", "src/index.js"]
