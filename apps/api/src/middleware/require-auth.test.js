import { describe, it, expect, vi } from "vitest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const { requireAuth } = await import("./require-auth.js");
const { signAccessToken, signPendingToken } = await import("../lib/jwt.js");
const { UnauthorizedError } = await import("../lib/errors.js");

function mockReq(headerValue) {
  return { get: vi.fn().mockReturnValue(headerValue) };
}

describe("requireAuth", () => {
  it("to'g'ri Bearer token bilan req.auth'ni o'rnatadi, next()ni xatosiz chaqiradi", () => {
    const token = signAccessToken({ userId: "u1", companyId: "c1", roleId: "r1" });
    const req = mockReq(`Bearer ${token}`);
    const next = vi.fn();

    requireAuth(req, {}, next);

    expect(req.auth).toEqual({ userId: "u1", companyId: "c1", roleId: "r1" });
    expect(next).toHaveBeenCalledWith();
  });

  it("header bo'lmasa UnauthorizedError bilan next() chaqiradi", () => {
    const req = mockReq(undefined);
    const next = vi.fn();

    requireAuth(req, {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it("Bearer prefiksisiz headerni rad etadi", () => {
    const req = mockReq("Token abc");
    const next = vi.fn();

    requireAuth(req, {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it("buzilgan tokenni rad etadi", () => {
    const req = mockReq("Bearer buzilgan.token");
    const next = vi.fn();

    requireAuth(req, {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it("pending token'ni access sifatida rad etadi", () => {
    const token = signPendingToken({ userId: "u1" });
    const req = mockReq(`Bearer ${token}`);
    const next = vi.fn();

    requireAuth(req, {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });
});
