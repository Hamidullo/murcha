import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  priceType: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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

describe("POST /api/v1/price-types", () => {
  beforeEach(() => {
    fakeTx.priceType.create.mockReset().mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.priceType.updateMany.mockReset().mockResolvedValue({});
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/price-types").send({ name: "Chakana" });

    expect(res.status).toBe(401);
  });

  it("ruxsat bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/price-types")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Chakana" });

    expect(res.status).toBe(403);
  });

  it("to'g'ri body bilan 201 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/price-types")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Chakana" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ companyId: "c1", name: "Chakana" });
  });
});

describe("GET /api/v1/price-types", () => {
  it("ro'yxatni qaytaradi", async () => {
    fakeTx.priceType.findMany.mockResolvedValue([{ id: "pt1", name: "Chakana" }]);

    const res = await request(createApp())
      .get("/api/v1/price-types")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.priceTypes).toEqual([{ id: "pt1", name: "Chakana" }]);
  });
});

describe("PATCH /api/v1/price-types/:id", () => {
  it("mavjud bo'lsa yangilaydi", async () => {
    fakeTx.priceType.findUnique.mockResolvedValue({ id: "pt1", name: "Eski" });
    fakeTx.priceType.update.mockResolvedValue({ id: "pt1", name: "Yangi" });

    const res = await request(createApp())
      .patch("/api/v1/price-types/pt1")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Yangi" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "pt1", name: "Yangi" });
  });
});
