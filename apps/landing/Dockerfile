# Root kontekstdan quriladi (pnpm monorepo lockfile kerak):
#   docker build -f apps/landing/Dockerfile .
# `apps/web`dan farqli — bu yerda statik build (vite-ssg) + nginx bilan
# serve qilinadi, dev-server emas: SEO'ning butun maqsadi (server-render
# HTML, Googlebot uchun JS shart emas) faqat production build'da ishlaydi.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/landing/package.json apps/landing/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter=@murcha/landing...

FROM deps AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/landing/node_modules ./apps/landing/node_modules
COPY packages/shared ./packages/shared
COPY apps/landing ./apps/landing
WORKDIR /repo/apps/landing
RUN pnpm build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /repo/apps/landing/dist /usr/share/nginx/html
EXPOSE 80
