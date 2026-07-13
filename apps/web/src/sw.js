// Web Push + offline precache uchun maxsus service worker (vite-plugin-pwa
// `injectManifest` strategiyasi). App-shell (JS/CSS/HTML) build vaqtida
// keshlanadi — ilova offline'da ham ochiladi. Yozish (mutatsiya) so'rovlari
// bu yerda keshlanmaydi, ular `lib/offline-outbox.js`dagi IndexedDB navbat
// orqali boshqariladi (Service Worker Background Sync API emas — Safari/iOS
// SyncManager'ni qo'llab-quvvatlamaydi, ilova darajasidagi navbat barcha
// brauzerlarda bir xil ishlaydi).
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Barcha GET so'rovlar (ro'yxatlar, hisobotlar) — tarmoq mavjud bo'lsa
// undan, aks holda so'nggi keshdan. POST/PATCH/DELETE bu qoidaga tushmaydi
// (Workbox route'lari standart bo'yicha faqat GET'ni ushlaydi).
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/v1/"),
  new NetworkFirst({ cacheName: "web-api-cache" }),
);

self.skipWaiting();
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Murcha", {
      body: payload.body ?? "",
      data: payload.data ?? {},
      icon: "/favicon.svg",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
