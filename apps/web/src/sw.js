// Web Push uchun maxsus service worker (vite-plugin-pwa `injectManifest`
// strategiyasi, precache yo'q — hozircha faqat push/notificationclick kerak,
// to'liq offline rejim keyingi faza).
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
