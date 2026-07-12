import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  exchangeRate: { findFirst: vi.fn(), upsert: vi.fn() },
  company: { findUnique: vi.fn() },
  rolePermission: { findFirst: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const { createApp } = await import("../../app.js");
const { signAccessToken } = await import("../../lib/jwt.js");

const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
const token = signAccessToken(auth);

function resetFakeTx() {
  for (const model of Object.values(fakeTx)) {
    if (typeof model !== "object") continue;
    for (const fn of Object.values(model)) {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    }
  }
}

describe("GET /api/v1/exchange-rates/current", () => {
  beforeEach(() => resetFakeTx());

  it("kurs topilmasa 404 qaytaradi", async () => {
    fakeTx.exchangeRate.findFirst.mockResolvedValue(null);
    fakeTx.company.findUnique.mockResolvedValue({ settings: {} });

    const res = await request(createApp())
      .get("/api/v1/exchange-rates/current?currency=USD")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("kompaniya kursi bo'lsa 200 va source:company qaytaradi", async () => {
    fakeTx.exchangeRate.findFirst.mockResolvedValue({
      rate: 12800,
      rateDate: new Date("2026-07-12"),
    });

    const res = await request(createApp())
      .get("/api/v1/exchange-rates/current?currency=USD")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ currency: "USD", rate: 12800, source: "company" });
  });
});

describe("POST /api/v1/exchange-rates", () => {
  beforeEach(() => resetFakeTx());

  it("companies.manage ruxsati yo'q bo'lsa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/exchange-rates")
      .set("Authorization", `Bearer ${token}`)
      .send({ currency: "USD", rate: 12800 });

    expect(res.status).toBe(403);
  });

  it("companies.manage ruxsati bo'lsa 201 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.exchangeRate.upsert.mockResolvedValue({ id: "e1", rate: 12800 });

    const res = await request(createApp())
      .post("/api/v1/exchange-rates")
      .set("Authorization", `Bearer ${token}`)
      .send({ currency: "USD", rate: 12800 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "e1", rate: 12800 });
  });
});
