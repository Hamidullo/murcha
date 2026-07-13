import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  user: { findUnique: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));
vi.mock("../../lib/password.js", () => ({
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

const fakeRedis = {
  get: vi.fn(),
  set: vi.fn().mockResolvedValue("OK"),
  del: vi.fn().mockResolvedValue(undefined),
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(undefined),
};
vi.mock("../../lib/redis.js", () => ({ redis: fakeRedis }));

const { createApp } = await import("../../app.js");
const { verifyPassword } = await import("../../lib/password.js");

const loginDto = { phone: "+998901234567", password: "Murcha2026!" };

describe("POST /api/v1/platform-auth/login", () => {
  beforeEach(() => {
    fakeTx.user.findUnique.mockReset();
    verifyPassword.mockReset().mockResolvedValue(true);
    fakeRedis.get.mockReset().mockResolvedValue(null);
    fakeRedis.incr.mockReset().mockResolvedValue(1);
  });

  it("isPlatformAdmin=true bo'lsa 200 + accessToken qaytaradi", async () => {
    fakeTx.user.findUnique.mockResolvedValue({
      id: "u1",
      phone: loginDto.phone,
      fullName: "Admin",
      passwordHash: "hash",
      isPlatformAdmin: true,
    });

    const res = await request(createApp()).post("/api/v1/platform-auth/login").send(loginDto);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: "u1", phone: loginDto.phone, fullName: "Admin" });
  });

  it("isPlatformAdmin=false bo'lsa 401 qaytaradi", async () => {
    fakeTx.user.findUnique.mockResolvedValue({
      id: "u1",
      phone: loginDto.phone,
      fullName: "Oddiy",
      passwordHash: "hash",
      isPlatformAdmin: false,
    });

    const res = await request(createApp()).post("/api/v1/platform-auth/login").send(loginDto);

    expect(res.status).toBe(401);
  });

  it("foydalanuvchi topilmasa 401 qaytaradi", async () => {
    fakeTx.user.findUnique.mockResolvedValue(null);

    const res = await request(createApp()).post("/api/v1/platform-auth/login").send(loginDto);

    expect(res.status).toBe(401);
  });

  it("telefon bo'yicha 5 marta xato urinishdan keyin 403 qaytaradi", async () => {
    fakeRedis.get.mockResolvedValue("5");

    const res = await request(createApp()).post("/api/v1/platform-auth/login").send(loginDto);

    expect(res.status).toBe(403);
  });
});
