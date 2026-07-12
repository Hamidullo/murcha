import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyToken = vi.fn();
vi.mock("./jwt.js", () => ({ verifyToken }));
vi.mock("./logger.js", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

const recordMock = vi.fn();
vi.mock("../modules/courier-locations/courier-locations.service.js", () => ({
  CourierLocationsService: class {
    record(...args) {
      return recordMock(...args);
    }
  },
}));
vi.mock("../modules/courier-locations/courier-locations.repository.js", () => ({
  CourierLocationsRepository: class {},
}));
vi.mock("../modules/companies/company-members.repository.js", () => ({
  CompanyMembersRepository: class {},
}));

/** @type {{ use: Function, on: Function, to: Function }} */
let fakeIoInstance;
const emitMock = vi.fn();
const toMock = vi.fn(() => ({ emit: emitMock }));

vi.mock("socket.io", () => ({
  Server: vi.fn().mockImplementation(function FakeServer() {
    fakeIoInstance = {
      use: vi.fn(),
      on: vi.fn(),
      to: toMock,
    };
    return fakeIoInstance;
  }),
}));

describe("lib/socket.js", () => {
  let initSocket;
  let emitToCompany;

  beforeEach(async () => {
    vi.resetModules();
    verifyToken.mockReset();
    emitMock.mockReset();
    toMock.mockClear();
    recordMock.mockReset();
    ({ initSocket, emitToCompany } = await import("./socket.js"));
  });

  describe("initSocket", () => {
    it("http.Server bilan socket.io Server yaratadi va use/on ro'yxatdan o'tkazadi", () => {
      const httpServer = {};

      const io = initSocket(httpServer);

      expect(io).toBe(fakeIoInstance);
      expect(fakeIoInstance.use).toHaveBeenCalledWith(expect.any(Function));
      expect(fakeIoInstance.on).toHaveBeenCalledWith("connection", expect.any(Function));
    });

    it("auth middleware — to'g'ri token bilan socket.data'ga companyId/userId yozadi", () => {
      initSocket({});
      verifyToken.mockReturnValue({ type: "access", userId: "u1", companyId: "c1" });
      const useHandler = fakeIoInstance.use.mock.calls[0][0];
      const socket = { handshake: { auth: { token: "valid-token" } }, data: {} };
      const next = vi.fn();

      useHandler(socket, next);

      expect(socket.data).toEqual({ companyId: "c1", userId: "u1" });
      expect(next).toHaveBeenCalledWith();
    });

    it("auth middleware — yaroqsiz token bilan xato bilan next chaqiradi", () => {
      initSocket({});
      verifyToken.mockImplementation(() => {
        throw new Error("invalid");
      });
      const useHandler = fakeIoInstance.use.mock.calls[0][0];
      const socket = { handshake: { auth: {} }, data: {} };
      const next = vi.fn();

      useHandler(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it("auth middleware — pending token turi bilan xato bilan next chaqiradi", () => {
      initSocket({});
      verifyToken.mockReturnValue({ type: "pending", userId: "u1" });
      const useHandler = fakeIoInstance.use.mock.calls[0][0];
      const socket = { handshake: { auth: { token: "pending-token" } }, data: {} };
      const next = vi.fn();

      useHandler(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it("connection handler — socketni company:{companyId} xonasiga qo'shadi", () => {
      initSocket({});
      const connectionHandler = fakeIoInstance.on.mock.calls[0][1];
      const join = vi.fn();
      const socket = { data: { companyId: "c1" }, join, on: vi.fn() };

      connectionHandler(socket);

      expect(join).toHaveBeenCalledWith("company:c1");
    });
  });

  describe("courier:location", () => {
    function connectSocket() {
      initSocket({});
      const connectionHandler = fakeIoInstance.on.mock.calls[0][1];
      const on = vi.fn();
      const socket = { data: { companyId: "c1", userId: "u1" }, join: vi.fn(), on };
      connectionHandler(socket);
      return on.mock.calls.find(([event]) => event === "courier:location")[1];
    }

    it("noto'g'ri koordinata bilan record() chaqirilmaydi", async () => {
      const locationHandler = connectSocket();

      await locationHandler({ lat: "abc", lng: 69.2 });

      expect(recordMock).not.toHaveBeenCalled();
    });

    it("to'g'ri koordinata bilan record()ni chaqiradi va courier:position uzatadi", async () => {
      recordMock.mockResolvedValue({
        courierMemberId: "m1",
        lat: 41.3,
        lng: 69.2,
        recordedAt: new Date(),
      });
      const locationHandler = connectSocket();

      await locationHandler({ lat: 41.3, lng: 69.2 });

      expect(recordMock).toHaveBeenCalledWith(
        { companyId: "c1", userId: "u1" },
        { lat: 41.3, lng: 69.2 },
      );
      expect(toMock).toHaveBeenCalledWith("company:c1");
      expect(emitMock).toHaveBeenCalledWith(
        "courier:position",
        expect.objectContaining({ courierMemberId: "m1" }),
      );
    });

    it("record() null qaytarsa (a'zolik topilmadi) hech narsa uzatilmaydi", async () => {
      recordMock.mockResolvedValue(null);
      const locationHandler = connectSocket();

      await locationHandler({ lat: 41.3, lng: 69.2 });

      expect(toMock).not.toHaveBeenCalled();
    });
  });

  describe("emitToCompany", () => {
    it("initSocket chaqirilmagan bo'lsa jim o'tkazib yuboradi", () => {
      expect(() => emitToCompany("c1", "notification", { id: "n1" })).not.toThrow();
      expect(toMock).not.toHaveBeenCalled();
    });

    it("initSocket chaqirilgan bo'lsa company xonasiga emit qiladi", () => {
      initSocket({});

      emitToCompany("c1", "notification", { id: "n1" });

      expect(toMock).toHaveBeenCalledWith("company:c1");
      expect(emitMock).toHaveBeenCalledWith("notification", { id: "n1" });
    });
  });
});
