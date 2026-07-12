import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  stock: { findMany: vi.fn() },
  stockMovement: { findMany: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const { createApp } = await import("../../app.js");
const { signAccessToken } = await import("../../lib/jwt.js");

const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
const token = signAccessToken(auth);

const PRODUCT_ID = "00000000-0000-7000-8000-000000000003";

describe("GET /api/v1/stock", () => {
  beforeEach(() => {
    fakeTx.stock.findMany.mockReset();
    fakeTx.stockMovement.findMany.mockReset();
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).get("/api/v1/stock");

    expect(res.status).toBe(401);
  });

  it("ro'yxatni qaytaradi", async () => {
    fakeTx.stock.findMany.mockResolvedValue([{ id: "s1", quantity: 10 }]);

    const res = await request(createApp())
      .get("/api/v1/stock")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stock).toEqual([{ id: "s1", quantity: 10 }]);
  });

  it("noto'g'ri query (uuid emas) 400 qaytaradi", async () => {
    const res = await request(createApp())
      .get("/api/v1/stock")
      .query({ warehouseId: "not-a-uuid" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/stock/low", () => {
  it("quantity<=minQty qatorlarni qaytaradi", async () => {
    fakeTx.stock.findMany.mockResolvedValue([
      { id: "s1", quantity: 2, minQty: 5 },
      { id: "s2", quantity: 10, minQty: 5 },
    ]);

    const res = await request(createApp())
      .get("/api/v1/stock/low")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stock).toEqual([{ id: "s1", quantity: 2, minQty: 5 }]);
  });
});

describe("GET /api/v1/stock/average-cost", () => {
  it("productId bo'lmasa 400 qaytaradi", async () => {
    const res = await request(createApp())
      .get("/api/v1/stock/average-cost")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("og'irlashtirilgan o'rtachani qaytaradi", async () => {
    fakeTx.stockMovement.findMany.mockResolvedValue([
      { qty: 10, costPrice: 100 },
      { qty: 10, costPrice: 200 },
    ]);

    const res = await request(createApp())
      .get("/api/v1/stock/average-cost")
      .query({ productId: PRODUCT_ID })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ productId: PRODUCT_ID, averageCost: 150 });
  });
});
