import { Server } from "socket.io";
import { verifyToken } from "./jwt.js";
import { logger } from "./logger.js";
import { CourierLocationsService } from "../modules/courier-locations/courier-locations.service.js";
import { CourierLocationsRepository } from "../modules/courier-locations/courier-locations.repository.js";
import { CompanyMembersRepository } from "../modules/companies/company-members.repository.js";

/** @type {import("socket.io").Server | null} */
let io = null;

const courierLocationsService = new CourierLocationsService({
  courierLocationsRepository: new CourierLocationsRepository(),
  companyMembersRepository: new CompanyMembersRepository(),
});

/**
 * `http.Server`ga Socket.IO ulaydi (`index.js`da `app.listen()` natijasi bilan
 * chaqiriladi). Ulanishda `socket.handshake.auth.token`dan JWT access token
 * tekshiriladi (`requireAuth` middleware bilan bir xil `verifyToken()`),
 * muvaffaqiyatli bo'lsa socket `company:{companyId}` xonasiga qo'shiladi —
 * bildirishnomalar shu xonaga yetkaziladi (`emitToCompany()`). Kuryer
 * `courier:location` eventi bilan `{lat, lng}` yuboradi — `courier-locations`
 * moduliga yoziladi va `courier:position` sifatida qayta uzatiladi (jonli
 * xarita, Faza 7).
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

    socket.on("courier:location", async (payload) => {
      const lat = Number(payload?.lat);
      const lng = Number(payload?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      try {
        const result = await courierLocationsService.record(
          { companyId: socket.data.companyId, userId: socket.data.userId },
          { lat, lng },
        );
        if (result) {
          emitToCompany(socket.data.companyId, "courier:position", result);
        }
      } catch (err) {
        logger.error({ err }, "courier:location qayta ishlashda xato");
      }
    });
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
