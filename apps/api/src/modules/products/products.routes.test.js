import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  product: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  unit: { findUnique: vi.fn() },
  category: { findUnique: vi.fn() },
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
const dto = {
  sku: "SKU-1",
  nameUz: "Non",
  baseUnitId: "00000000-0000-7000-8000-000000000001",
};

describe("POST /api/v1/products", () => {
  beforeEach(() => {
    fakeTx.product.create.mockReset().mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.product.findFirst.mockReset().mockResolvedValue(null);
    fakeTx.unit.findUnique.mockReset().mockResolvedValue({ id: dto.baseUnitId, short: "dona" });
    fakeTx.category.findUnique.mockReset();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/products").send(dto);

    expect(res.status).toBe(401);
  });

  it("ruxsat bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send(dto);

    expect(res.status).toBe(403);
  });

  it("noto'g'ri body (baseUnitId yo'q) 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ sku: "SKU-1", nameUz: "Non" });

    expect(res.status).toBe(400);
  });

  it("SKU band bo'lsa 409 qaytaradi", async () => {
    fakeTx.product.findFirst.mockResolvedValue({ id: "p-existing" });

    const res = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send(dto);

    expect(res.status).toBe(409);
  });

  it("baseUnitId topilmasa 404 qaytaradi", async () => {
    fakeTx.unit.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send(dto);

    expect(res.status).toBe(404);
  });

  it("to'g'ri body bilan 201 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send(dto);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ companyId: "c1", sku: "SKU-1", nameUz: "Non" });
  });
});

describe("GET /api/v1/products", () => {
  it("ro'yxatni qaytaradi", async () => {
    fakeTx.product.findMany.mockResolvedValue([{ id: "p1", nameUz: "Non" }]);

    const res = await request(createApp())
      .get("/api/v1/products")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([{ id: "p1", nameUz: "Non" }]);
  });
});

describe("GET /api/v1/products/:id", () => {
  it("topilmasa 404 qaytaradi", async () => {
    fakeTx.product.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/products/p1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/products/:id", () => {
  it("mavjud bo'lsa 204 qaytaradi va status:archived bilan yangilaydi", async () => {
    fakeTx.product.findUnique.mockResolvedValue({ id: "p1" });
    fakeTx.product.update.mockResolvedValue({ id: "p1", status: "archived" });

    const res = await request(createApp())
      .delete("/api/v1/products/p1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(fakeTx.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ status: "archived" }),
    });
  });
});
