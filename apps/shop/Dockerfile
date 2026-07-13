# Root kontekstdan quriladi (pnpm monorepo lockfile kerak):
#   docker build -f apps/shop/Dockerfile .
# `apps/landing`dagi bilan bir xil naqsh — statik build (Vite SPA) + nginx
# bilan serve qilinadi (dev-server emas, Faza 12: prod uchun).

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/shop/package.json apps/shop/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter=@murcha/shop...

FROM deps AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/shop/node_modules ./apps/shop/node_modules
COPY packages/shared ./packages/shared
COPY apps/shop ./apps/shop
WORKDIR /repo/apps/shop
RUN pnpm build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /repo/apps/shop/dist /usr/share/nginx/html
# SPA — noma'lum yo'l uchun `index.html`ga qaytariladi (client-side routing).
COPY apps/shop/nginx.spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
