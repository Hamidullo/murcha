import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  warehouse: { findUnique: vi.fn() },
  product: { findUnique: vi.fn() },
  stock: { findMany: vi.fn(), upsert: vi.fn() },
  stockMovement: { create: vi.fn() },
  docCounter: { upsert: vi.fn() },
  warehouseDoc: { create: vi.fn() },
  warehouseDocItem: { create: vi.fn() },
  inventoryCount: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  inventoryCountItem: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const hasPermission = vi.fn().mockResolvedValue(true);
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

const WAREHOUSE_ID = "00000000-0000-7000-8000-000000000001";
const COUNT_ID = "00000000-0000-7000-8000-000000000002";
const ITEM_ID = "00000000-0000-7000-8000-000000000003";

describe("POST /api/v1/inventory-counts", () => {
  beforeEach(() => {
    Object.values(fakeTx.inventoryCount).forEach((fn) => fn.mockReset());
    fakeTx.warehouse.findUnique.mockReset();
    fakeTx.stock.findMany.mockReset();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/inventory-counts")
      .send({ warehouseId: WAREHOUSE_ID });

    expect(res.status).toBe(401);
  });

  it("sklad topilmasa 404 qaytaradi", async () => {
    fakeTx.warehouse.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/inventory-counts")
      .set("Authorization", `Bearer ${token}`)
      .send({ warehouseId: WAREHOUSE_ID });

    expect(res.status).toBe(404);
  });

  it("to'g'ri bo'lsa 201 qaytaradi va Stock qatorlaridan item yaratadi", async () => {
    fakeTx.warehouse.findUnique.mockResolvedValue({ id: WAREHOUSE_ID });
    fakeTx.stock.findMany.mockResolvedValue([
      { productId: "p1", variantId: null, batchId: null, quantity: 10 },
    ]);
    fakeTx.inventoryCount.create.mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.inventoryCountItem.create.mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.inventoryCount.findUnique.mockResolvedValue({
      id: COUNT_ID,
      status: "in_progress",
      items: [{ productId: "p1", systemQty: 10 }],
    });

    const res = await request(createApp())
      .post("/api/v1/inventory-counts")
      .set("Authorization", `Bearer ${token}`)
      .send({ warehouseId: WAREHOUSE_ID });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("in_progress");
    expect(fakeTx.inventoryCountItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ productId: "p1", systemQty: 10 }),
      }),
    );
  });
});

describe("PATCH /api/v1/inventory-counts/:id/items/:itemId", () => {
  beforeEach(() => {
    fakeTx.inventoryCount.findUnique.mockReset();
    fakeTx.inventoryCountItem.findUnique.mockReset();
    fakeTx.inventoryCountItem.update.mockReset();
  });

  it("in_progress bo'lmasa 409 qaytaradi", async () => {
    fakeTx.inventoryCount.findUnique.mockResolvedValue({ id: COUNT_ID, status: "approved" });

    const res = await request(createApp())
      .patch(`/api/v1/inventory-counts/${COUNT_ID}/items/${ITEM_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ countedQty: 5 });

    expect(res.status).toBe(409);
  });

  it("to'g'ri bo'lsa diff bilan yangilaydi", async () => {
    fakeTx.inventoryCount.findUnique.mockResolvedValue({ id: COUNT_ID, status: "in_progress" });
    fakeTx.inventoryCountItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      countId: COUNT_ID,
      systemQty: 10,
    });
    fakeTx.inventoryCountItem.update.mockImplementation((args) =>
      Promise.resolve({ id: ITEM_ID, ...args.data }),
    );

    const res = await request(createApp())
      .patch(`/api/v1/inventory-counts/${COUNT_ID}/items/${ITEM_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ countedQty: 7 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ countedQty: 7, diff: -3 });
  });
});

describe("POST /api/v1/inventory-counts/:id/approve", () => {
  beforeEach(() => {
    fakeTx.inventoryCount.findUnique.mockReset();
    fakeTx.inventoryCount.update.mockReset();
    fakeTx.product.findUnique.mockReset();
    fakeTx.docCounter.upsert.mockReset();
    fakeTx.warehouseDoc.create.mockReset();
    fakeTx.warehouseDocItem.create.mockReset();
    fakeTx.stock.upsert.mockReset();
    fakeTx.stockMovement.create.mockReset();
  });

  it("in_progress bo'lmasa 409 qaytaradi", async () => {
    fakeTx.inventoryCount.findUnique.mockResolvedValue({ id: COUNT_ID, status: "approved" });

    const res = await request(createApp())
      .post(`/api/v1/inventory-counts/${COUNT_ID}/approve`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it("sanoq kiritilmagan qator bo'lsa 400 qaytaradi", async () => {
    fakeTx.inventoryCount.findUnique.mockResolvedValue({
      id: COUNT_ID,
      status: "in_progress",
      items: [{ id: ITEM_ID, countedQty: null, systemQty: 10 }],
    });

    const res = await request(createApp())
      .post(`/api/v1/inventory-counts/${COUNT_ID}/approve`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("farqi bor qator uchun tuzatish hujjati yaratib, approved qaytaradi", async () => {
    fakeTx.inventoryCount.findUnique.mockResolvedValue({
      id: COUNT_ID,
      warehouseId: WAREHOUSE_ID,
      status: "in_progress",
      items: [
        {
          id: ITEM_ID,
          productId: "p1",
          variantId: null,
          batchId: null,
          countedQty: 7,
          systemQty: 10,
        },
      ],
    });
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1", baseUnitId: "u1" });
    fakeTx.docCounter.upsert.mockResolvedValue({ counter: 1 });
    fakeTx.warehouseDoc.create.mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.warehouseDocItem.create.mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.inventoryCount.update.mockImplementation((args) =>
      Promise.resolve({ id: COUNT_ID, ...args.data }),
    );

    const res = await request(createApp())
      .post(`/api/v1/inventory-counts/${COUNT_ID}/approve`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
    expect(fakeTx.warehouseDoc.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "writeoff" }) }),
    );
    expect(fakeTx.stock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { quantity: { increment: -3 } } }),
    );
  });
});
