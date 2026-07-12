import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const COUNTERPARTY_ID = "11111111-1111-7111-8111-111111111111";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  counterparty: { findUnique: vi.fn() },
  debtMovement: {
    aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
  salePoint: { findUnique: vi.fn() },
  userAssignment: { findFirst: vi.fn() },
  rolePermission: { findFirst: vi.fn() },
  company: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
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

describe("GET /api/v1/debts/counterparties/:id/balance", () => {
  beforeEach(() => resetFakeTx());

  it("topilmasa 404 qaytaradi", async () => {
    fakeTx.counterparty.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .get(`/api/v1/debts/counterparties/${COUNTERPARTY_ID}/balance`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("ruxsat yo'q va boshqa sotuv nuqtasi bo'lsa 404 qaytaradi", async () => {
    fakeTx.counterparty.findUnique.mockResolvedValue({ id: COUNTERPARTY_ID, companyId: "c1" });
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);
    fakeTx.userAssignment.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .get(`/api/v1/debts/counterparties/${COUNTERPARTY_ID}/balance`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("debts.view ruxsati bo'lsa 200 va balansni qaytaradi", async () => {
    fakeTx.counterparty.findUnique.mockResolvedValue({ id: COUNTERPARTY_ID, companyId: "c1" });
    fakeTx.rolePermission.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "rp1" });
    fakeTx.debtMovement.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

    const res = await request(createApp())
      .get(`/api/v1/debts/counterparties/${COUNTERPARTY_ID}/balance`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ counterpartyId: COUNTERPARTY_ID, currency: "UZS", balance: 5000 });
  });
});

describe("GET /api/v1/debts/aging", () => {
  beforeEach(() => resetFakeTx());

  it("debts.view ruxsati bo'lmasa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/debts/aging")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("ruxsat bo'lsa 200 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.debtMovement.findMany.mockResolvedValue([]);

    const res = await request(createApp())
      .get("/api/v1/debts/aging")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.counterparties).toEqual([]);
  });
});

describe("POST /api/v1/debts/adjustments", () => {
  beforeEach(() => resetFakeTx());

  const body = { counterpartyId: COUNTERPARTY_ID, type: "opening", amount: 10000, currency: "UZS" };

  it("debts.manage ruxsati bo'lmasa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/debts/adjustments")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(403);
  });

  it("to'g'ri holatda 201 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.counterparty.findUnique.mockResolvedValue({ id: COUNTERPARTY_ID, companyId: "c1" });
    fakeTx.debtMovement.create.mockResolvedValue({ id: "m1", ...body });

    const res = await request(createApp())
      .post("/api/v1/debts/adjustments")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(201);
  });
});

describe("GET /api/v1/debts/me/balance", () => {
  beforeEach(() => resetFakeTx());

  it("sotuv nuqtasiga biriktirilmagan bo'lsa 403 qaytaradi", async () => {
    fakeTx.userAssignment.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/debts/me/balance")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("biriktirilgan bo'lsa 200 va balansni qaytaradi", async () => {
    fakeTx.userAssignment.findFirst.mockResolvedValue({ targetId: "sp1" });
    fakeTx.salePoint.findUnique.mockResolvedValue({ id: "sp1", counterpartyId: COUNTERPARTY_ID });
    fakeTx.debtMovement.aggregate.mockResolvedValue({ _sum: { amount: 750 } });

    const res = await request(createApp())
      .get("/api/v1/debts/me/balance")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(750);
  });
});

describe("GET /api/v1/debts/counterparties/:id/statement.pdf", () => {
  beforeEach(() => resetFakeTx());

  it("to'g'ri holatda application/pdf bilan javob qaytaradi", async () => {
    fakeTx.counterparty.findUnique.mockResolvedValue({
      id: COUNTERPARTY_ID,
      companyId: "c1",
      name: "Do'kon 1",
    });
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.debtMovement.findMany.mockResolvedValue([]);
    fakeTx.company.findUnique.mockResolvedValue({ id: "c1", name: "Chaqqon" });

    const res = await request(createApp())
      .get(`/api/v1/debts/counterparties/${COUNTERPARTY_ID}/statement.pdf`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });
});
