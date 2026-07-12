import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  counterparty: {
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

describe("POST /api/v1/counterparties", () => {
  beforeEach(() => {
    Object.values(fakeTx.counterparty).forEach((fn) => fn.mockReset());
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/counterparties")
      .send({ type: "supplier", name: "Aziz Trade" });

    expect(res.status).toBe(401);
  });

  it("ruxsat bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/counterparties")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "supplier", name: "Aziz Trade" });

    expect(res.status).toBe(403);
  });

  it("noto'g'ri body (qisqa nom) 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/counterparties")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "supplier", name: "A" });

    expect(res.status).toBe(400);
  });

  it("to'g'ri body bilan 201 qaytaradi", async () => {
    fakeTx.counterparty.create.mockImplementation((args) => Promise.resolve(args.data));

    const res = await request(createApp())
      .post("/api/v1/counterparties")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "supplier", name: "Aziz Trade" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ companyId: "c1", type: "supplier", name: "Aziz Trade" });
  });
});

describe("GET /api/v1/counterparties", () => {
  it("ro'yxatni qaytaradi", async () => {
    fakeTx.counterparty.findMany.mockResolvedValue([{ id: "cp1", name: "Aziz Trade" }]);

    const res = await request(createApp())
      .get("/api/v1/counterparties")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.counterparties).toEqual([{ id: "cp1", name: "Aziz Trade" }]);
  });
});

describe("DELETE /api/v1/counterparties/:id", () => {
  it("topilmasa 404 qaytaradi", async () => {
    fakeTx.counterparty.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .delete("/api/v1/counterparties/cp1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("mavjud bo'lsa arxivlaydi", async () => {
    fakeTx.counterparty.findUnique.mockResolvedValue({ id: "cp1" });
    fakeTx.counterparty.update.mockResolvedValue({ id: "cp1", isActive: false });

    const res = await request(createApp())
      .delete("/api/v1/counterparties/cp1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "cp1", isActive: false });
  });
});
