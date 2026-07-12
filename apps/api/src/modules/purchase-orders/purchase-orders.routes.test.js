import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  warehouse: { findUnique: vi.fn() },
  product: { findUnique: vi.fn() },
  productUnit: { findUnique: vi.fn() },
  docCounter: { upsert: vi.fn() },
  purchaseOrder: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  purchaseOrderItem: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  warehouseDoc: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  warehouseDocItem: { create: vi.fn() },
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
const SUPPLIER_ID = "00000000-0000-7000-8000-000000000002";
const PO_ID = "00000000-0000-7000-8000-000000000003";
const PRODUCT_ID = "00000000-0000-7000-8000-000000000004";
const UNIT_ID = "00000000-0000-7000-8000-000000000005";
const PO_ITEM_ID = "00000000-0000-7000-8000-000000000006";

describe("POST /api/v1/purchase-orders", () => {
  beforeEach(() => {
    Object.values(fakeTx.purchaseOrder).forEach((fn) => fn.mockReset());
    fakeTx.warehouse.findUnique.mockReset();
    fakeTx.docCounter.upsert.mockReset();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/purchase-orders")
      .send({ supplierId: SUPPLIER_ID, warehouseId: WAREHOUSE_ID });

    expect(res.status).toBe(401);
  });

  it("sklad topilmasa 404 qaytaradi", async () => {
    fakeTx.warehouse.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/purchase-orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ supplierId: SUPPLIER_ID, warehouseId: WAREHOUSE_ID });

    expect(res.status).toBe(404);
  });

  it("to'g'ri bo'lsa 201 va raqam qaytaradi", async () => {
    fakeTx.warehouse.findUnique.mockResolvedValue({ id: WAREHOUSE_ID });
    fakeTx.docCounter.upsert.mockResolvedValue({ counter: 1 });
    fakeTx.purchaseOrder.create.mockImplementation((args) => Promise.resolve(args.data));

    const res = await request(createApp())
      .post("/api/v1/purchase-orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ supplierId: SUPPLIER_ID, warehouseId: WAREHOUSE_ID });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
    expect(res.body.number).toMatch(/^PO-\d{4}-00001$/);
  });
});

describe("POST /api/v1/purchase-orders/:id/receive", () => {
  beforeEach(() => {
    Object.values(fakeTx.purchaseOrder).forEach((fn) => fn.mockReset());
    Object.values(fakeTx.purchaseOrderItem).forEach((fn) => fn.mockReset());
    Object.values(fakeTx.warehouseDoc).forEach((fn) => fn.mockReset());
    fakeTx.warehouseDocItem.create.mockReset();
    fakeTx.product.findUnique.mockReset();
    fakeTx.docCounter.upsert.mockReset();
  });

  const poRow = (over) => ({
    id: PO_ID,
    warehouseId: WAREHOUSE_ID,
    supplierId: SUPPLIER_ID,
    currency: "UZS",
    exchangeRate: null,
    status: "draft",
    items: [
      {
        id: PO_ITEM_ID,
        purchaseOrderId: PO_ID,
        productId: PRODUCT_ID,
        unitId: UNIT_ID,
        qty: 10,
        qtyReceived: 0,
        price: 20,
      },
    ],
    ...over,
  });

  it("received POda 409 qaytaradi", async () => {
    fakeTx.purchaseOrder.findUnique.mockResolvedValue(poRow({ status: "received" }));

    const res = await request(createApp())
      .post(`/api/v1/purchase-orders/${PO_ID}/receive`)
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ poItemId: PO_ITEM_ID, qty: 5 }] });

    expect(res.status).toBe(409);
  });

  it("qolgandan ko'p miqdorda 400 qaytaradi", async () => {
    fakeTx.purchaseOrder.findUnique.mockResolvedValue(poRow());

    const res = await request(createApp())
      .post(`/api/v1/purchase-orders/${PO_ID}/receive`)
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ poItemId: PO_ITEM_ID, qty: 999 }] });

    expect(res.status).toBe(400);
  });

  it("to'g'ri bo'lsa 201 va draft kirim hujjat qaytaradi", async () => {
    fakeTx.purchaseOrder.findUnique
      .mockResolvedValueOnce(poRow())
      .mockResolvedValueOnce(poRow({ items: [{ id: PO_ITEM_ID, qty: 10, qtyReceived: 10 }] }));
    fakeTx.docCounter.upsert.mockResolvedValue({ counter: 1 });
    fakeTx.warehouseDoc.create.mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.warehouseDoc.findUnique.mockResolvedValue({ id: "d1", status: "draft" });
    fakeTx.product.findUnique.mockResolvedValue({ id: PRODUCT_ID, baseUnitId: UNIT_ID });

    const res = await request(createApp())
      .post(`/api/v1/purchase-orders/${PO_ID}/receive`)
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ poItemId: PO_ITEM_ID, qty: 10 }] });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "d1", status: "draft" });
    expect(fakeTx.purchaseOrderItem.update).toHaveBeenCalledWith({
      where: { id: PO_ITEM_ID },
      data: { qtyReceived: { increment: 10 } },
    });
    expect(fakeTx.purchaseOrder.update).toHaveBeenCalledWith({
      where: { id: PO_ID },
      data: { status: "received" },
    });
  });
});
