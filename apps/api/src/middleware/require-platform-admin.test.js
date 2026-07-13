import { describe, it, expect, vi } from "vitest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const { requirePlatformAdmin } = await import("./require-platform-admin.js");
const { signAccessToken, signPlatformAccessToken } = await import("../lib/jwt.js");
const { UnauthorizedError } = await import("../lib/errors.js");

function mockReq(headerValue) {
  return { get: vi.fn().mockReturnValue(headerValue) };
}

describe("requirePlatformAdmin", () => {
  it("to'g'ri platform_access token bilan req.platformAuth'ni o'rnatadi", () => {
    const token = signPlatformAccessToken({ userId: "u1" });
    const req = mockReq(`Bearer ${token}`);
    const next = vi.fn();

    requirePlatformAdmin(req, {}, next);

    expect(req.platformAuth).toEqual({ userId: "u1" });
    expect(next).toHaveBeenCalledWith();
  });

  it("header bo'lmasa UnauthorizedError bilan next() chaqiradi", () => {
    const req = mockReq(undefined);
    const next = vi.fn();

    requirePlatformAdmin(req, {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it("oddiy access token'ni (kompaniyaga bog'langan) rad etadi", () => {
    const token = signAccessToken({ userId: "u1", companyId: "c1", roleId: "r1" });
    const req = mockReq(`Bearer ${token}`);
    const next = vi.fn();

    requirePlatformAdmin(req, {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it("buzilgan tokenni rad etadi", () => {
    const req = mockReq("Bearer buzilgan.token");
    const next = vi.fn();

    requirePlatformAdmin(req, {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });
});
