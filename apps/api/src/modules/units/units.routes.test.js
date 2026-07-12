import { describe, it, expect, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  unit: { findMany: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const { createApp } = await import("../../app.js");
const { signAccessToken } = await import("../../lib/jwt.js");

const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
const token = signAccessToken(auth);

describe("GET /api/v1/units", () => {
  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).get("/api/v1/units");

    expect(res.status).toBe(401);
  });

  it("ro'yxatni qaytaradi", async () => {
    fakeTx.unit.findMany.mockResolvedValue([{ id: "unit-dona", name: "dona" }]);

    const res = await request(createApp())
      .get("/api/v1/units")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.units).toEqual([{ id: "unit-dona", name: "dona" }]);
  });
});
