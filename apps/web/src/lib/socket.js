import { io } from "socket.io-client";

/**
 * Backend `lib/socket.js`ga ulanadi — JWT access token `auth.token` orqali
 * yuboriladi (server tomonda `verifyToken()` bilan tekshiriladi, keyin
 * `company:{companyId}` xonasiga qo'shiladi).
 * @param {string} accessToken
 * @returns {import("socket.io-client").Socket}
 */
export function connectSocket(accessToken) {
  return io("/", { path: "/socket.io", auth: { token: accessToken }, transports: ["websocket"] });
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
