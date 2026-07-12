import { io } from "socket.io-client";

/** @type {import("socket.io-client").Socket | null} */
let socket = null;

/**
 * Backend `lib/socket.js`ga ulanadi — JWT access token `auth.token` orqali
 * yuboriladi. Butun ilova bo'yicha bitta ulanish (singleton) — `ShopLayout.vue`
 * ochadi, `OrderDetailPage.vue` kuryer jonli joylashuvini (`courier:position`)
 * shu ulanishdan tinglaydi (Faza 7).
 * @param {string} accessToken
 * @returns {import("socket.io-client").Socket}
 */
export function connectSocket(accessToken) {
  if (socket) return socket;
  socket = io("/", { path: "/socket.io", auth: { token: accessToken }, transports: ["websocket"] });
  return socket;
}

/** @returns {import("socket.io-client").Socket | null} */
export function getSocket() {
  return socket;
}

/** @returns {void} */
export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
