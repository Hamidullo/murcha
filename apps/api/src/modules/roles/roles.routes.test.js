import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  role: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  permission: {
    findMany: vi.fn(),
  },
  rolePermission: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const hasPermission = vi.fn().mockResolvedValue(true);
vi.mock("./roles.repository.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    RolesRepository: class extends actual.RolesRepository {
      hasPermission(...args) {
        return hasPermission(...args);
      }
    },
  };
});

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
}

describe("POST /api/v1/roles", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/roles").send({ name: "Sotuvchi" });
    expect(res.status).toBe(401);
  });

  it("ruxsat bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/roles")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Sotuvchi" });

    expect(res.status).toBe(403);
  });

  it("to'g'ri bo'lsa 201 qaytaradi", async () => {
    fakeTx.role.create.mockImplementation((args) => Promise.resolve(args.data));

    const res = await request(createApp())
      .post("/api/v1/roles")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Sotuvchi" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ companyId: "c1", name: "Sotuvchi", isSystem: false });
  });
});

describe("GET /api/v1/roles/permissions", () => {
  it("ruxsatlar ro'yxatini qaytaradi", async () => {
    fakeTx.permission.findMany.mockResolvedValue([{ id: "p1", code: "orders.view" }]);

    const res = await request(createApp())
      .get("/api/v1/roles/permissions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.permissions).toEqual([{ id: "p1", code: "orders.view" }]);
  });
});

describe("PUT /api/v1/roles/:id/permissions", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("tizim rolida 403 qaytaradi", async () => {
    fakeTx.role.findUnique.mockResolvedValue({ id: "r1", companyId: null, isSystem: true });

    const res = await request(createApp())
      .put("/api/v1/roles/r1/permissions")
      .set("Authorization", `Bearer ${token}`)
      .send({ permissionIds: ["11111111-1111-7111-8111-111111111111"] });

    expect(res.status).toBe(403);
  });

  it("maxsus rolda 204 qaytaradi", async () => {
    fakeTx.role.findUnique.mockResolvedValue({ id: "r2", companyId: "c1", isSystem: false });

    const res = await request(createApp())
      .put("/api/v1/roles/r2/permissions")
      .set("Authorization", `Bearer ${token}`)
      .send({ permissionIds: ["11111111-1111-7111-8111-111111111111"] });

    expect(res.status).toBe(204);
    expect(fakeTx.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: "r2" } });
  });
});
