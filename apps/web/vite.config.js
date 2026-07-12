import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Monorepo ildizidagi bitta `.env`dan `VITE_VAPID_PUBLIC_KEY`ni o'qish uchun
  // (Docker Compose/API bilan bir xil `.env`, apps/web'ning o'zida alohida yo'q).
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectManifest: { injectionPoint: undefined },
      manifest: {
        name: "Murcha — Sklad",
        short_name: "Murcha",
        description: "Sklad/ega/buxgalter boshqaruv ilovasi",
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
    port: 5173,
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
