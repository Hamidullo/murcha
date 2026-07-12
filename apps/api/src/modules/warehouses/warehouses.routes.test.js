import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  warehouse: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
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

describe("POST /api/v1/warehouses", () => {
  beforeEach(() => {
    fakeTx.warehouse.create.mockReset().mockImplementation((args) => Promise.resolve(args.data));
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/warehouses").send({ name: "Markaziy" });

    expect(res.status).toBe(401);
  });

  it("ruxsat bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/warehouses")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Markaziy" });

    expect(res.status).toBe(403);
  });

  it("noto'g'ri body (qisqa nom) 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/warehouses")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "A" });

    expect(res.status).toBe(400);
  });

  it("to'g'ri body bilan 201 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/warehouses")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Markaziy sklad" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ companyId: "c1", name: "Markaziy sklad" });
  });
});

describe("GET /api/v1/warehouses", () => {
  it("ro'yxatni qaytaradi", async () => {
    fakeTx.warehouse.findMany.mockResolvedValue([{ id: "w1", name: "Markaziy" }]);

    const res = await request(createApp())
      .get("/api/v1/warehouses")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.warehouses).toEqual([{ id: "w1", name: "Markaziy" }]);
  });
});

describe("GET /api/v1/warehouses/:id", () => {
  it("topilmasa 404 qaytaradi", async () => {
    fakeTx.warehouse.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/warehouses/w1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/warehouses/:id", () => {
  it("mavjud bo'lsa yangilaydi", async () => {
    fakeTx.warehouse.findUnique.mockResolvedValue({ id: "w1", name: "Eski" });
    fakeTx.warehouse.update.mockResolvedValue({ id: "w1", name: "Yangi" });

    const res = await request(createApp())
      .patch("/api/v1/warehouses/w1")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Yangi" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "w1", name: "Yangi" });
  });
});
