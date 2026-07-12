import { io } from "socket.io-client";

/** @type {import("socket.io-client").Socket | null} */
let socket = null;

/**
 * Backend `lib/socket.js`ga ulanadi — JWT access token `auth.token` orqali
 * yuboriladi (server tomonda `verifyToken()` bilan tekshiriladi, keyin
 * `company:{companyId}` xonasiga qo'shiladi). Butun ilova bo'yicha **bitta**
 * ulanish (singleton) — `AppLayout.vue` bildirishnomalar uchun ochadi,
 * kuryer/xarita sahifalari xuddi shu ulanishni qayta ishlatadi (`getSocket()`).
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

/** Web Audio API orqali qisqa "ding" — alohida audio fayl kerak emas. */
export function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio qo'llab-quvvatlanmasa (masalan avtomatlashtirilgan test) — jim o'tkazib yuboriladi.
  }
}
