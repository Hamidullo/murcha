import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  order: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  stockMovement: { findMany: vi.fn().mockResolvedValue([]) },
  stock: { findMany: vi.fn().mockResolvedValue([]) },
  product: { findUnique: vi.fn() },
  transaction: { findMany: vi.fn().mockResolvedValue([]) },
  debtMovement: { findMany: vi.fn().mockResolvedValue([]) },
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

describe("GET /api/v1/reports/sales", () => {
  beforeEach(() => resetFakeTx());

  it("reports.view ruxsati yo'q bo'lsa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/reports/sales")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("reports.view ruxsati bo'lsa 200 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.order.findMany.mockResolvedValue([
      { confirmedAt: new Date("2026-07-01"), items: [{ price: 1000, qtyAccepted: 2 }] },
    ]);

    const res = await request(createApp())
      .get("/api/v1/reports/sales")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sales: [{ date: "2026-07-01", total: 2000, count: 1 }] });
  });
});

describe("GET /api/v1/reports/products", () => {
  beforeEach(() => resetFakeTx());

  it("reports.view ruxsati bo'lsa 200 va bo'sh ro'yxat qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.order.findMany.mockResolvedValue([]);

    const res = await request(createApp())
      .get("/api/v1/reports/products")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products: [] });
  });
});

describe("GET /api/v1/reports/stock-turnover", () => {
  beforeEach(() => resetFakeTx());

  it("reports.view ruxsati bo'lsa 200 va bo'sh ro'yxat qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.stockMovement.findMany.mockResolvedValue([]);

    const res = await request(createApp())
      .get("/api/v1/reports/stock-turnover")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products: [] });
  });
});

describe("GET /api/v1/reports/dashboard", () => {
  beforeEach(() => resetFakeTx());

  it("reports.view ruxsati yo'q bo'lsa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/reports/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("reports.view ruxsati bo'lsa 200 va tarkibni qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.order.findMany.mockResolvedValue([]);
    fakeTx.order.count.mockResolvedValue(0);
    fakeTx.transaction.findMany.mockResolvedValue([]);
    fakeTx.debtMovement.findMany.mockResolvedValue([]);
    fakeTx.stock.findMany.mockResolvedValue([]);

    const res = await request(createApp())
      .get("/api/v1/reports/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todaySales: 0,
      pendingOrders: 0,
      cashBalanceByCurrency: {},
      debtTotal: 0,
      debtOverdue: 0,
      lowStockCount: 0,
    });
  });
});
