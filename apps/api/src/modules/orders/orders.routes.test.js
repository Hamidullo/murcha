import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  order: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  orderStatusHistory: { create: vi.fn() },
  docCounter: { upsert: vi.fn().mockResolvedValue({ counter: 1 }) },
  salePoint: { findUnique: vi.fn() },
  counterparty: { findUnique: vi.fn() },
  warehouse: { findUnique: vi.fn() },
  product: { findUnique: vi.fn() },
  productPrice: { findMany: vi.fn() },
  userAssignment: { findFirst: vi.fn() },
  stock: { findUnique: vi.fn(), upsert: vi.fn() },
  company: { findUnique: vi.fn() },
  exchangeRate: { findFirst: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const hasPermission = vi.fn().mockResolvedValue(false);
vi.mock("../roles/roles.repository.js", () => ({
  RolesRepository: class {
    hasPermission(...args) {
      return hasPermission(...args);
    }
  },
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
  fakeTx.docCounter.upsert.mockResolvedValue({ counter: 1 });
}

describe("POST /api/v1/orders", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(false);
  });

  const body = {
    warehouseId: "11111111-1111-7111-8111-111111111111",
    idempotencyKey: "22222222-2222-7222-8222-222222222222",
    items: [
      {
        productId: "33333333-3333-7333-8333-333333333333",
        unitId: "44444444-4444-7444-8444-444444444444",
        qty: 2,
      },
    ],
  };

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/orders").send(body);
    expect(res.status).toBe(401);
  });

  it("foydalanuvchi sotuv nuqtasiga biriktirilmagan bo'lsa 403 qaytaradi", async () => {
    fakeTx.userAssignment.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(403);
  });

  it("to'g'ri holatda 201 bilan zakaz yaratadi", async () => {
    fakeTx.userAssignment.findFirst.mockResolvedValue({ targetId: "sp1" });
    fakeTx.salePoint.findUnique.mockResolvedValue({
      id: "sp1",
      priceTypeId: "pt1",
      counterpartyId: "cp1",
    });
    fakeTx.warehouse.findUnique.mockResolvedValue({ id: body.warehouseId });
    fakeTx.counterparty.findUnique.mockResolvedValue({ paymentTermDays: 10 });
    fakeTx.product.findUnique.mockResolvedValue({
      id: body.items[0].productId,
      baseUnitId: body.items[0].unitId,
      nameUz: "Non",
      deletedAt: null,
    });
    fakeTx.productPrice.findMany.mockResolvedValue([
      { priceTypeId: "pt1", price: 5000, currency: "UZS" },
    ]);
    fakeTx.order.findUnique.mockResolvedValue(null);
    fakeTx.order.create.mockImplementation((args) => Promise.resolve({ ...args.data, items: [] }));

    const res = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ companyId: "c1", status: "new", total: 10000 });
  });

  it("noto'g'ri body (bo'sh items) 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...body, items: [] });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/orders/:id/invoice.pdf", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("zakaz topilmasa 404 qaytaradi", async () => {
    fakeTx.order.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/orders/o1/invoice.pdf")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("zakaz topilsa PDF qaytaradi", async () => {
    fakeTx.order.findUnique.mockResolvedValue({
      id: "o1",
      number: "ZAK-2026-00001",
      salePointId: "sp1",
      salePoint: { name: "Do'kon 1" },
      confirmedAt: new Date("2026-07-01"),
      currency: "UZS",
      total: 20000,
      items: [
        {
          product: { nameUz: "Non", sku: "SKU-1" },
          unit: { short: "dona" },
          qtyOrdered: 2,
          qtyShipped: 2,
          price: 10000,
          total: 20000,
        },
      ],
    });
    fakeTx.company.findUnique.mockResolvedValue({ name: "Chaqqon savdo", logoPath: null });

    const res = await request(createApp())
      .get("/api/v1/orders/o1/invoice.pdf")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });
});

describe("GET /api/v1/orders", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("orders.view ruxsati bilan ro'yxatni qaytaradi", async () => {
    fakeTx.order.findMany.mockResolvedValue([{ id: "o1" }]);

    const res = await request(createApp())
      .get("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toEqual([{ id: "o1" }]);
  });
});

describe("POST /api/v1/orders/:id/confirm", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("orders.confirm ruxsati bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/orders/o1/confirm")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("yetarli qoldiq bo'lsa tasdiqlaydi (200)", async () => {
    fakeTx.order.findUnique.mockResolvedValue({
      id: "o1",
      status: "new",
      warehouseId: "w1",
      salePointId: "sp1",
      currency: "UZS",
      total: 1000,
      paymentTermDays: 0,
      items: [{ productId: "p1", variantId: null, qtyBaseOrdered: 2 }],
    });
    fakeTx.salePoint.findUnique.mockResolvedValue({ id: "sp1", counterpartyId: "cp1" });
    fakeTx.counterparty.findUnique.mockResolvedValue({ id: "cp1", creditLimit: null });
    fakeTx.stock.findUnique.mockResolvedValue({ quantity: 10, reserved: 0 });
    fakeTx.stock.upsert.mockResolvedValue({ id: "s1" });
    fakeTx.order.update.mockImplementation((args) => Promise.resolve({ id: "o1", ...args.data }));

    const res = await request(createApp())
      .post("/api/v1/orders/o1/confirm")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "confirmed" });
  });

  it("yetarli qoldiq bo'lmasa 409 qaytaradi", async () => {
    fakeTx.order.findUnique.mockResolvedValue({
      id: "o1",
      status: "new",
      warehouseId: "w1",
      salePointId: "sp1",
      currency: "UZS",
      total: 1000,
      paymentTermDays: 0,
      items: [{ productId: "p1", variantId: null, qtyBaseOrdered: 20 }],
    });
    fakeTx.salePoint.findUnique.mockResolvedValue({ id: "sp1", counterpartyId: "cp1" });
    fakeTx.counterparty.findUnique.mockResolvedValue({ id: "cp1", creditLimit: null });
    fakeTx.stock.findUnique.mockResolvedValue({ quantity: 10, reserved: 0 });

    const res = await request(createApp())
      .post("/api/v1/orders/o1/confirm")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
  });
});

describe("POST /api/v1/orders/:id/cancel", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("'shipped' holatda 409 qaytaradi", async () => {
    fakeTx.order.findUnique.mockResolvedValue({
      id: "o1",
      status: "shipped",
      warehouseId: "w1",
      items: [],
    });

    const res = await request(createApp())
      .post("/api/v1/orders/o1/cancel")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it("'new' holatda 200 bilan bekor qiladi", async () => {
    fakeTx.order.findUnique.mockResolvedValue({
      id: "o1",
      status: "new",
      warehouseId: "w1",
      items: [],
    });
    fakeTx.order.update.mockImplementation((args) => Promise.resolve({ id: "o1", ...args.data }));

    const res = await request(createApp())
      .post("/api/v1/orders/o1/cancel")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "cancelled" });
  });
});
