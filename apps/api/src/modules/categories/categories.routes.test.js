import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  category: {
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

describe("POST /api/v1/categories", () => {
  beforeEach(() => {
    fakeTx.category.create.mockReset().mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.category.findUnique.mockReset();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/categories")
      .send({ nameUz: "Ichimliklar" });

    expect(res.status).toBe(401);
  });

  it("ruxsat bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ nameUz: "Ichimliklar" });

    expect(res.status).toBe(403);
  });

  it("parentId topilmasa 404 qaytaradi", async () => {
    fakeTx.category.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ nameUz: "Sharbatlar", parentId: "00000000-0000-7000-8000-000000000001" });

    expect(res.status).toBe(404);
  });

  it("to'g'ri body bilan 201 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ nameUz: "Ichimliklar" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ companyId: "c1", nameUz: "Ichimliklar" });
  });
});

describe("GET /api/v1/categories", () => {
  it("ro'yxatni qaytaradi", async () => {
    fakeTx.category.findMany.mockResolvedValue([{ id: "cat1", nameUz: "Ichimliklar" }]);

    const res = await request(createApp())
      .get("/api/v1/categories")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual([{ id: "cat1", nameUz: "Ichimliklar" }]);
  });
});

describe("PATCH /api/v1/categories/:id", () => {
  it("o'zini ota qilib bo'lmaydi — 400 qaytaradi", async () => {
    fakeTx.category.findUnique.mockReset().mockResolvedValue({ id: "cat1" });

    const res = await request(createApp())
      .patch("/api/v1/categories/cat1")
      .set("Authorization", `Bearer ${token}`)
      .send({ parentId: "cat1" });

    expect(res.status).toBe(400);
  });

  it("mavjud bo'lsa yangilaydi", async () => {
    fakeTx.category.findUnique.mockReset().mockResolvedValue({ id: "cat1", nameUz: "Eski" });
    fakeTx.category.update.mockResolvedValue({ id: "cat1", nameUz: "Yangi" });

    const res = await request(createApp())
      .patch("/api/v1/categories/cat1")
      .set("Authorization", `Bearer ${token}`)
      .send({ nameUz: "Yangi" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "cat1", nameUz: "Yangi" });
  });
});
