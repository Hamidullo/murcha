import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyToken = vi.fn();
vi.mock("./jwt.js", () => ({ verifyToken }));
vi.mock("./logger.js", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

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
      const socket = { data: { companyId: "c1" }, join };

      connectionHandler(socket);

      expect(join).toHaveBeenCalledWith("company:c1");
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
