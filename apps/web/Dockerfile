# Root kontekstdan quriladi (pnpm monorepo lockfile kerak):
#   docker build -f apps/web/Dockerfile .
# Hozircha dev-server rejimi (Vite HMR) — build+nginx static rejimi
# productionga tayyorlanganda qo'shiladi.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile --filter=@murcha/web...

FROM base AS runner
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/packages ./packages
COPY apps/web ./apps/web
WORKDIR /repo/apps/web

EXPOSE 5173
CMD ["pnpm", "dev", "--", "--host"]
