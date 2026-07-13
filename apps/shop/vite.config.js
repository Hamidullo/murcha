import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Katalog/sklad ro'yxati offline'da ham ko'rinishi uchun — so'nggi
      // muvaffaqiyatli javob keshlanadi, tarmoq bo'lsa avval tarmoqdan
      // so'raladi (yangi narx/qoldiqni imkon qadar tezroq ko'rsatish uchun).
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api/v1/shop-catalog") ||
              url.pathname.startsWith("/api/v1/warehouses"),
            handler: "NetworkFirst",
            options: {
              cacheName: "shop-catalog-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "Murcha — Do'kon",
        short_name: "Murcha",
        description: "Sotuv nuqtasi uchun zakaz berish ilovasi",
        theme_color: "#f59e0b",
        background_color: "#fff8f0",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
