import { describe, it, expect, vi } from "vitest";
import { AuthController } from "./auth.controller.js";

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(body = {}, cookieValue) {
  return {
    body,
    get: vi.fn().mockReturnValue("test-agent"),
    ip: "127.0.0.1",
    cookies: cookieValue ? { murcha_rt: cookieValue } : {},
    params: {},
  };
}

const authResult = {
  status: "authenticated",
  accessToken: "access-token",
  sessionId: "s1",
  refreshToken: "refresh-token",
  user: { id: "u1", phone: "+998901234567", fullName: "Test" },
  company: { id: "c1", name: "Test Kompaniya" },
};

describe("AuthController.register", () => {
  it("201 qaytaradi, sessiya cookie qo'yadi, refreshToken JSON'da yo'q", async () => {
    const authService = { registerCompany: vi.fn().mockResolvedValue(authResult) };
    const controller = new AuthController({ authService });
    const req = mockReq({ phone: "+998901234567" });
    const res = mockRes();
    const next = vi.fn();

    await controller.register(req, res, next);

    expect(authService.registerCompany).toHaveBeenCalledWith(
      req.body,
      expect.objectContaining({ userAgent: "test-agent", ip: "127.0.0.1" }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      "murcha_rt",
      "s1.refresh-token",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.refreshToken).toBeUndefined();
    expect(body.accessToken).toBe("access-token");
  });

  it("service xato otsa next(err) chaqiradi", async () => {
    const err = new Error("boom");
    const authService = { registerCompany: vi.fn().mockRejectedValue(err) };
    const controller = new AuthController({ authService });
    const next = vi.fn();

    await controller.register(mockReq({}), mockRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

describe("AuthController.login", () => {
  it("authenticated bo'lsa cookie qo'yib 200 qaytaradi", async () => {
    const authService = { login: vi.fn().mockResolvedValue(authResult) };
    const controller = new AuthController({ authService });
    const res = mockRes();

    await controller.login(mockReq({ phone: "x", password: "y" }), res, vi.fn());

    expect(res.cookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("select_company bo'lsa cookie qo'ymaydi", async () => {
    const selectResult = { status: "select_company", pendingToken: "p", companies: [] };
    const authService = { login: vi.fn().mockResolvedValue(selectResult) };
    const controller = new AuthController({ authService });
    const res = mockRes();

    await controller.login(mockReq({ phone: "x", password: "y" }), res, vi.fn());

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(selectResult);
  });
});

describe("AuthController.selectCompany", () => {
  it("cookie qo'yib 200 qaytaradi", async () => {
    const authService = { selectCompany: vi.fn().mockResolvedValue(authResult) };
    const controller = new AuthController({ authService });
    const res = mockRes();

    await controller.selectCompany(mockReq({ pendingToken: "p", companyId: "c1" }), res, vi.fn());

    expect(res.cookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("AuthController.refresh", () => {
  it("cookie'ni parse qilib service.refresh'ni chaqiradi, yangi cookie qo'yadi", async () => {
    const authService = {
      refresh: vi.fn().mockResolvedValue({
        accessToken: "new-access",
        sessionId: "s1",
        refreshToken: "new-refresh",
      }),
    };
    const controller = new AuthController({ authService });
    const req = mockReq({}, "s1.old-refresh");
    const res = mockRes();

    await controller.refresh(req, res, vi.fn());

    expect(authService.refresh).toHaveBeenCalledWith({
      sessionId: "s1",
      refreshToken: "old-refresh",
    });
    expect(res.cookie).toHaveBeenCalledWith(
      "murcha_rt",
      "s1.new-refresh",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.json).toHaveBeenCalledWith({ accessToken: "new-access" });
  });

  it("cookie bo'lmasa next(UnauthorizedError) chaqiradi", async () => {
    const authService = { refresh: vi.fn() };
    const controller = new AuthController({ authService });
    const next = vi.fn();

    await controller.refresh(mockReq({}), mockRes(), next);

    expect(next).toHaveBeenCalled();
    expect(authService.refresh).not.toHaveBeenCalled();
  });
});

describe("AuthController.logout", () => {
  it("sessiyani bekor qilib cookie'ni tozalaydi, 204 qaytaradi", async () => {
    const authService = { logout: vi.fn().mockResolvedValue(undefined) };
    const controller = new AuthController({ authService });
    const req = mockReq({}, "s1.rt");
    const res = mockRes();

    await controller.logout(req, res, vi.fn());

    expect(authService.logout).toHaveBeenCalledWith({ sessionId: "s1", refreshToken: "rt" });
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe("AuthController.listSessions", () => {
  it("sessiyalar ro'yxatini qaytaradi", async () => {
    const sessions = [{ id: "s1", current: true }];
    const authService = { listSessions: vi.fn().mockResolvedValue(sessions) };
    const controller = new AuthController({ authService });
    const req = mockReq({}, "s1.rt");
    const res = mockRes();

    await controller.listSessions(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sessions });
  });
});

describe("AuthController.revokeSession", () => {
  it("params.id bo'yicha sessiyani bekor qiladi, 204 qaytaradi", async () => {
    const authService = { revokeSession: vi.fn().mockResolvedValue(undefined) };
    const controller = new AuthController({ authService });
    const req = mockReq({}, "s1.rt");
    req.params = { id: "s2" };
    const res = mockRes();

    await controller.revokeSession(req, res, vi.fn());

    expect(authService.revokeSession).toHaveBeenCalledWith(
      { sessionId: "s1", refreshToken: "rt" },
      "s2",
    );
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe("AuthController.me", () => {
  it("req.auth asosida service.getCurrentUser'ni chaqirib 200 qaytaradi", async () => {
    const result = { user: { id: "u1" }, company: { id: "c1" }, roleId: "r1" };
    const authService = { getCurrentUser: vi.fn().mockResolvedValue(result) };
    const controller = new AuthController({ authService });
    const req = { auth: { userId: "u1", companyId: "c1", roleId: "r1" } };
    const res = mockRes();

    await controller.me(req, res, vi.fn());

    expect(authService.getCurrentUser).toHaveBeenCalledWith(req.auth);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});
