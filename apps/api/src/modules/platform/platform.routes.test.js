import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  company: { findMany: vi.fn(), findUnique: vi.fn() },
  subscription: { upsert: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const { createApp } = await import("../../app.js");
const { signPlatformAccessToken, signAccessToken } = await import("../../lib/jwt.js");

const platformToken = signPlatformAccessToken({ userId: "admin1" });

function resetFakeTx() {
  for (const model of Object.values(fakeTx)) {
    if (typeof model !== "object") continue;
    for (const fn of Object.values(model)) {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    }
  }
}

describe("GET /api/v1/platform/companies", () => {
  beforeEach(() => resetFakeTx());

  it("token bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).get("/api/v1/platform/companies");

    expect(res.status).toBe(401);
  });

  it("oddiy (kompaniyaga bog'langan) token bilan 401 qaytaradi", async () => {
    const companyToken = signAccessToken({ userId: "u1", companyId: "c1", roleId: "r1" });

    const res = await request(createApp())
      .get("/api/v1/platform/companies")
      .set("Authorization", `Bearer ${companyToken}`);

    expect(res.status).toBe(401);
  });

  it("platform token bilan 200 va ro'yxatni qaytaradi", async () => {
    fakeTx.company.findMany.mockResolvedValue([{ id: "c1", name: "Test", subscription: null }]);

    const res = await request(createApp())
      .get("/api/v1/platform/companies")
      .set("Authorization", `Bearer ${platformToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ companies: [{ id: "c1", name: "Test", subscription: null }] });
  });
});

describe("PATCH /api/v1/platform/companies/:id/subscription", () => {
  beforeEach(() => resetFakeTx());

  it("kompaniya topilmasa 404 qaytaradi", async () => {
    fakeTx.company.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .patch("/api/v1/platform/companies/c1/subscription")
      .set("Authorization", `Bearer ${platformToken}`)
      .send({ plan: "start" });

    expect(res.status).toBe(404);
  });

  it("to'g'ri body bilan 200 va yangilangan obunani qaytaradi", async () => {
    fakeTx.company.findUnique.mockResolvedValue({ id: "c1" });
    fakeTx.subscription.upsert.mockResolvedValue({ id: "s1", companyId: "c1", plan: "start" });

    const res = await request(createApp())
      .patch("/api/v1/platform/companies/c1/subscription")
      .set("Authorization", `Bearer ${platformToken}`)
      .send({ plan: "start" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "s1", companyId: "c1", plan: "start" });
  });

  it("noto'g'ri plan qiymati bilan 400 qaytaradi", async () => {
    const res = await request(createApp())
      .patch("/api/v1/platform/companies/c1/subscription")
      .set("Authorization", `Bearer ${platformToken}`)
      .send({ plan: "noexist" });

    expect(res.status).toBe(400);
  });
});
