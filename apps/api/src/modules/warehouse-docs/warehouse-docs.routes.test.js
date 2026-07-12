import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  warehouse: { findUnique: vi.fn() },
  product: { findUnique: vi.fn() },
  productUnit: { findUnique: vi.fn() },
  docCounter: { upsert: vi.fn() },
  stock: { findUnique: vi.fn(), upsert: vi.fn() },
  stockMovement: { create: vi.fn() },
  warehouseDoc: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  warehouseDocItem: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  company: { findUnique: vi.fn() },
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
const DOC_ID = "00000000-0000-7000-8000-000000000002";
const PRODUCT_ID = "00000000-0000-7000-8000-000000000003";
const UNIT_ID = "00000000-0000-7000-8000-000000000004";

describe("POST /api/v1/warehouse-docs", () => {
  beforeEach(() => {
    Object.values(fakeTx.warehouseDoc).forEach((fn) => fn.mockReset());
    fakeTx.warehouse.findUnique.mockReset();
    fakeTx.docCounter.upsert.mockReset();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/warehouse-docs")
      .send({ type: "receipt", warehouseId: WAREHOUSE_ID });

    expect(res.status).toBe(401);
  });

  it("sklad topilmasa 404 qaytaradi", async () => {
    fakeTx.warehouse.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/warehouse-docs")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "receipt", warehouseId: WAREHOUSE_ID });

    expect(res.status).toBe(404);
  });

  it("transfer'da toWarehouseId bo'lmasa 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/warehouse-docs")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "transfer", warehouseId: WAREHOUSE_ID });

    expect(res.status).toBe(400);
  });

  it("to'g'ri body bilan 201 va raqam qaytaradi", async () => {
    fakeTx.warehouse.findUnique.mockResolvedValue({ id: WAREHOUSE_ID });
    fakeTx.docCounter.upsert.mockResolvedValue({ counter: 1 });
    fakeTx.warehouseDoc.create.mockImplementation((args) => Promise.resolve(args.data));

    const res = await request(createApp())
      .post("/api/v1/warehouse-docs")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "receipt", warehouseId: WAREHOUSE_ID });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
    expect(res.body.number).toMatch(/^KIR-\d{4}-00001$/);
  });
});

describe("GET /api/v1/warehouse-docs/:id", () => {
  it("topilmasa 404 qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .get(`/api/v1/warehouse-docs/${DOC_ID}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("topsa qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue({ id: DOC_ID, status: "draft", items: [] });

    const res = await request(createApp())
      .get(`/api/v1/warehouse-docs/${DOC_ID}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(DOC_ID);
  });
});

describe("GET /api/v1/warehouse-docs/:id/act.pdf", () => {
  it("hujjat topilmasa 404 qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .get(`/api/v1/warehouse-docs/${DOC_ID}/act.pdf`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("hujjat topilsa PDF qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue({
      type: "receipt",
      number: "KIR-2026-00001",
      warehouse: { name: "Markaziy sklad" },
      toWarehouse: null,
      counterparty: { name: "Postavshchik" },
      confirmedAt: new Date("2026-07-01"),
      currency: "UZS",
      total: 50000,
      reason: null,
      items: [
        {
          product: { nameUz: "Choy", sku: "SKU-2" },
          unit: { short: "quti" },
          qty: 5,
          price: 10000,
          total: 50000,
        },
      ],
    });
    fakeTx.company.findUnique.mockResolvedValue({ name: "Chaqqon savdo", logoPath: null });

    const res = await request(createApp())
      .get(`/api/v1/warehouse-docs/${DOC_ID}/act.pdf`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });
});

describe("POST /api/v1/warehouse-docs/:id/items", () => {
  it("hujjat draft bo'lmasa 409 qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue({ id: DOC_ID, status: "confirmed" });

    const res = await request(createApp())
      .post(`/api/v1/warehouse-docs/${DOC_ID}/items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: PRODUCT_ID, unitId: UNIT_ID, qty: 5 });

    expect(res.status).toBe(409);
  });

  it("mahsulot topilmasa 404 qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue({ id: DOC_ID, status: "draft", items: [] });
    fakeTx.product.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post(`/api/v1/warehouse-docs/${DOC_ID}/items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: PRODUCT_ID, unitId: UNIT_ID, qty: 5 });

    expect(res.status).toBe(404);
  });

  it("to'g'ri bo'lsa 201 qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique
      .mockResolvedValueOnce({ id: DOC_ID, status: "draft" })
      .mockResolvedValueOnce({ id: DOC_ID, items: [{ total: 100 }] });
    fakeTx.product.findUnique.mockResolvedValue({ id: PRODUCT_ID, baseUnitId: UNIT_ID });
    fakeTx.warehouseDocItem.create.mockImplementation((args) => Promise.resolve(args.data));

    const res = await request(createApp())
      .post(`/api/v1/warehouse-docs/${DOC_ID}/items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: PRODUCT_ID, unitId: UNIT_ID, qty: 5, price: 20 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ qtyBase: 5, total: 100 });
  });
});

describe("POST /api/v1/warehouse-docs/:id/confirm", () => {
  beforeEach(() => {
    fakeTx.stock.findUnique.mockReset();
    fakeTx.stock.upsert.mockReset();
    fakeTx.stockMovement.create.mockReset();
  });

  it("draft bo'lmasa 409 qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue({ id: DOC_ID, status: "confirmed" });

    const res = await request(createApp())
      .post(`/api/v1/warehouse-docs/${DOC_ID}/confirm`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it("qoldiq yetarli bo'lmasa 409 (insufficient_stock) qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue({
      id: DOC_ID,
      type: "issue",
      warehouseId: WAREHOUSE_ID,
      status: "draft",
      items: [{ id: "i1", productId: PRODUCT_ID, variantId: null, batchId: null, qtyBase: 10 }],
    });
    fakeTx.stock.findUnique.mockResolvedValue({ quantity: 1 });

    const res = await request(createApp())
      .post(`/api/v1/warehouse-docs/${DOC_ID}/confirm`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("insufficient_stock");
  });

  it("to'g'ri bo'lsa qoldiqni yangilaydi va confirmed qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue({
      id: DOC_ID,
      type: "receipt",
      warehouseId: WAREHOUSE_ID,
      status: "draft",
      items: [{ id: "i1", productId: PRODUCT_ID, variantId: null, batchId: null, qtyBase: 10 }],
    });
    fakeTx.stock.upsert.mockResolvedValue({ quantity: 10 });
    fakeTx.stockMovement.create.mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.warehouseDoc.update.mockImplementation((args) =>
      Promise.resolve({ id: DOC_ID, ...args.data }),
    );

    const res = await request(createApp())
      .post(`/api/v1/warehouse-docs/${DOC_ID}/confirm`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("confirmed");
    expect(fakeTx.stock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { quantity: { increment: 10 } } }),
    );
  });
});

describe("POST /api/v1/warehouse-docs/:id/cancel", () => {
  beforeEach(() => {
    fakeTx.stock.findUnique.mockReset();
    fakeTx.stock.upsert.mockReset();
    fakeTx.stockMovement.create.mockReset();
  });

  it("draft hujjatda 409 qaytaradi (hali tasdiqlanmagan)", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue({ id: DOC_ID, status: "draft" });

    const res = await request(createApp())
      .post(`/api/v1/warehouse-docs/${DOC_ID}/cancel`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it("to'g'ri bo'lsa teskari harakat qiladi va cancelled qaytaradi", async () => {
    fakeTx.warehouseDoc.findUnique.mockResolvedValue({
      id: DOC_ID,
      type: "receipt",
      warehouseId: WAREHOUSE_ID,
      status: "confirmed",
      items: [{ id: "i1", productId: PRODUCT_ID, variantId: null, batchId: null, qtyBase: 10 }],
    });
    fakeTx.stock.findUnique.mockResolvedValue({ quantity: 10 });
    fakeTx.stock.upsert.mockResolvedValue({ quantity: 0 });
    fakeTx.stockMovement.create.mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.warehouseDoc.update.mockImplementation((args) =>
      Promise.resolve({ id: DOC_ID, ...args.data }),
    );

    const res = await request(createApp())
      .post(`/api/v1/warehouse-docs/${DOC_ID}/cancel`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
    expect(fakeTx.stock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { quantity: { increment: -10 } } }),
    );
  });
});
