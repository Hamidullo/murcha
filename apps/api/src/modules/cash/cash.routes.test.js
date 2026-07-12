import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  cashRegister: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
  },
  expenseCategory: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
  },
  transaction: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  cashShift: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
  },
  rolePermission: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const { createApp } = await import("../../app.js");
const { signAccessToken } = await import("../../lib/jwt.js");

const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
const token = signAccessToken(auth);
const REGISTER_ID = "11111111-1111-7111-8111-111111111111";

function resetFakeTx() {
  for (const model of Object.values(fakeTx)) {
    if (typeof model !== "object") continue;
    for (const fn of Object.values(model)) {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    }
  }
}

describe("POST /api/v1/cash/registers", () => {
  beforeEach(() => resetFakeTx());

  it("cash.manage ruxsati yo'q bo'lsa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/cash/registers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bosh kassa", type: "cash", currency: "UZS" });

    expect(res.status).toBe(403);
  });

  it("cash.manage ruxsati bo'lsa 201 va yaratilgan registerni qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.cashRegister.create.mockResolvedValue({ id: REGISTER_ID, name: "Bosh kassa" });

    const res = await request(createApp())
      .post("/api/v1/cash/registers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bosh kassa", type: "cash", currency: "UZS" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: REGISTER_ID, name: "Bosh kassa" });
  });

  it("noto'g'ri type bilan 400 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });

    const res = await request(createApp())
      .post("/api/v1/cash/registers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bosh kassa", type: "crypto", currency: "UZS" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/cash/transactions", () => {
  beforeEach(() => resetFakeTx());

  it("kassa topilmasa 404 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.cashRegister.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/cash/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ cashRegisterId: REGISTER_ID, type: "income", amount: 1000, currency: "UZS" });

    expect(res.status).toBe(404);
  });

  it("kassa mavjud bo'lsa 201 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.cashRegister.findUnique.mockResolvedValue({ id: REGISTER_ID });
    fakeTx.transaction.create.mockResolvedValue({ id: "t1", type: "income" });

    const res = await request(createApp())
      .post("/api/v1/cash/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ cashRegisterId: REGISTER_ID, type: "income", amount: 1000, currency: "UZS" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "t1", type: "income" });
  });
});

describe("GET /api/v1/cash/transactions", () => {
  beforeEach(() => resetFakeTx());

  it("cash.view ruxsati yo'q bo'lsa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/cash/transactions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("cash.view ruxsati bo'lsa 200 va ro'yxatni qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.transaction.findMany.mockResolvedValue([{ id: "t1" }]);

    const res = await request(createApp())
      .get("/api/v1/cash/transactions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ transactions: [{ id: "t1" }] });
  });
});

describe("POST /api/v1/cash/registers/:id/shifts", () => {
  beforeEach(() => resetFakeTx());

  it("kassa topilmasa 404 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.cashRegister.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post(`/api/v1/cash/registers/${REGISTER_ID}/shifts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ openingBalance: 0 });

    expect(res.status).toBe(404);
  });

  it("ochiq smena bo'lsa 409 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.cashRegister.findUnique.mockResolvedValue({ id: REGISTER_ID, companyId: "c1" });
    fakeTx.cashShift.findFirst.mockResolvedValue({ id: "s0" });

    const res = await request(createApp())
      .post(`/api/v1/cash/registers/${REGISTER_ID}/shifts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ openingBalance: 0 });

    expect(res.status).toBe(409);
  });

  it("to'g'ri holatda 201 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.cashRegister.findUnique.mockResolvedValue({ id: REGISTER_ID, companyId: "c1" });
    fakeTx.cashShift.findFirst.mockResolvedValue(null);
    fakeTx.cashShift.create.mockResolvedValue({ id: "s1" });

    const res = await request(createApp())
      .post(`/api/v1/cash/registers/${REGISTER_ID}/shifts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ openingBalance: 10000 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "s1" });
  });
});

describe("PATCH /api/v1/cash/shifts/:id/close", () => {
  beforeEach(() => resetFakeTx());

  it("smena topilmasa 404 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.cashShift.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .patch("/api/v1/cash/shifts/s1/close")
      .set("Authorization", `Bearer ${token}`)
      .send({ countedBalance: 1000 });

    expect(res.status).toBe(404);
  });

  it("to'g'ri holatda 200 va diff bilan qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.cashShift.findUnique.mockResolvedValue({
      id: "s1",
      cashRegisterId: REGISTER_ID,
      openedAt: new Date("2026-01-01"),
      openingBalance: 100000,
      closedAt: null,
    });
    fakeTx.cashRegister.findUnique.mockResolvedValue({ id: REGISTER_ID, companyId: "c1" });
    fakeTx.transaction.findMany.mockResolvedValue([{ type: "income", amount: 5000 }]);
    fakeTx.cashShift.update.mockResolvedValue({ id: "s1", diff: 0 });

    const res = await request(createApp())
      .patch("/api/v1/cash/shifts/s1/close")
      .set("Authorization", `Bearer ${token}`)
      .send({ countedBalance: 105000 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "s1", diff: 0 });
  });
});
