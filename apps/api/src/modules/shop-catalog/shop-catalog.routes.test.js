import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  product: { findMany: vi.fn() },
  productPrice: { findMany: vi.fn() },
  salePoint: { findUnique: vi.fn() },
  userAssignment: { findFirst: vi.fn() },
  stock: { findMany: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const { createApp } = await import("../../app.js");
const { signAccessToken } = await import("../../lib/jwt.js");

const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
const token = signAccessToken(auth);

describe("GET /api/v1/shop-catalog", () => {
  beforeEach(() => {
    for (const model of Object.values(fakeTx)) {
      if (typeof model !== "object") continue;
      for (const fn of Object.values(model)) {
        if (typeof fn?.mockReset === "function") fn.mockReset();
      }
    }
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).get("/api/v1/shop-catalog");
    expect(res.status).toBe(401);
  });

  it("foydalanuvchi nuqtaga biriktirilmagan bo'lsa 403 qaytaradi", async () => {
    fakeTx.userAssignment.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/shop-catalog")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("to'g'ri holatda narxlangan mahsulotlar ro'yxatini qaytaradi", async () => {
    fakeTx.userAssignment.findFirst.mockResolvedValue({ targetId: "sp1" });
    fakeTx.salePoint.findUnique.mockResolvedValue({ id: "sp1", priceTypeId: "pt1" });
    fakeTx.product.findMany.mockResolvedValue([
      {
        id: "p1",
        sku: "SKU-1",
        nameUz: "Non",
        categoryId: null,
        baseUnitId: "u1",
        status: "active",
      },
    ]);
    fakeTx.productPrice.findMany.mockResolvedValue([
      { priceTypeId: "pt1", price: 5000, currency: "UZS" },
    ]);

    const res = await request(createApp())
      .get("/api/v1/shop-catalog")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      {
        productId: "p1",
        sku: "SKU-1",
        nameUz: "Non",
        categoryId: null,
        baseUnitId: "u1",
        price: 5000,
        currency: "UZS",
        availableQty: null,
      },
    ]);
  });

  it("noto'g'ri query (warehouseId uuid emas) 400 qaytaradi", async () => {
    fakeTx.userAssignment.findFirst.mockResolvedValue({ targetId: "sp1" });

    const res = await request(createApp())
      .get("/api/v1/shop-catalog?warehouseId=notauuid")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});
