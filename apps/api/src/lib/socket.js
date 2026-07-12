import { Server } from "socket.io";
import { verifyToken } from "./jwt.js";
import { logger } from "./logger.js";

/** @type {import("socket.io").Server | null} */
let io = null;

/**
 * `http.Server`ga Socket.IO ulaydi (`index.js`da `app.listen()` natijasi bilan
 * chaqiriladi). Ulanishda `socket.handshake.auth.token`dan JWT access token
 * tekshiriladi (`requireAuth` middleware bilan bir xil `verifyToken()`),
 * muvaffaqiyatli bo'lsa socket `company:{companyId}` xonasiga qo'shiladi —
 * bildirishnomalar shu xonaga yetkaziladi (`emitToCompany()`).
 * @param {import("node:http").Server} httpServer
 * @returns {import("socket.io").Server}
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: "*" } });

  io.use((socket, next) => {
    try {
      const decoded = verifyToken(socket.handshake.auth?.token ?? "");
      if (decoded.type !== "access") {
        throw new Error("Noto'g'ri token turi");
      }
      socket.data.companyId = decoded.companyId;
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Avtorizatsiya xatosi"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`company:${socket.data.companyId}`);
  });

  return io;
}

/**
 * Best-effort real-time yetkazish — `initSocket()` chaqirilmagan bo'lsa
 * (masalan testlarda) jim o'tkazib yuboriladi, xato otilmaydi.
 * @param {string} companyId
 * @param {string} event
 * @param {unknown} payload
 * @returns {void}
 */
export function emitToCompany(companyId, event, payload) {
  if (!io) return;
  try {
    io.to(`company:${companyId}`).emit(event, payload);
  } catch (err) {
    logger.error({ err, companyId, event }, "Socket.IO orqali yuborishda xato");
  }
}
