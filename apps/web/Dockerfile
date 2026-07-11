# Hozircha bog'liqlik yo'q — Node builtin http bilan statik placeholder.
# Faza 2'da bu Dockerfile haqiqiy Vite dev-server/build+nginx bilan almashadi.

FROM node:22-alpine
WORKDIR /app
COPY apps/web/src ./src

EXPOSE 5173
CMD ["node", "src/server.js"]
