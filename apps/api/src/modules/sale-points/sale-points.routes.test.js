import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  salePoint: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  counterparty: {
    create: vi.fn(),
    update: vi.fn(),
  },
  priceType: {
    findUnique: vi.fn(),
  },
  companyMember: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  userAssignment: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
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

function resetFakeTx() {
  for (const model of Object.values(fakeTx)) {
    if (typeof model !== "object") continue;
    for (const fn of Object.values(model)) {
      if (typeof fn?.mockReset === "function") fn.mockReset();
    }
  }
}

describe("POST /api/v1/sale-points", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/sale-points")
      .send({ name: "Do'kon 1", priceTypeId: "11111111-1111-7111-8111-111111111111" });

    expect(res.status).toBe(401);
  });

  it("ruxsat bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/sale-points")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Do'kon 1", priceTypeId: "11111111-1111-7111-8111-111111111111" });

    expect(res.status).toBe(403);
  });

  it("narx turi topilmasa 404 qaytaradi", async () => {
    fakeTx.priceType.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/sale-points")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Do'kon 1", priceTypeId: "11111111-1111-7111-8111-111111111111" });

    expect(res.status).toBe(404);
  });

  it("to'g'ri body bilan avval counterparty, keyin sale point yaratadi (201)", async () => {
    fakeTx.priceType.findUnique.mockResolvedValue({ id: "pt1" });
    fakeTx.counterparty.create.mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.salePoint.create.mockImplementation((args) => Promise.resolve(args.data));

    const res = await request(createApp())
      .post("/api/v1/sale-points")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Do'kon 1", priceTypeId: "11111111-1111-7111-8111-111111111111" });

    expect(res.status).toBe(201);
    expect(fakeTx.counterparty.create).toHaveBeenCalled();
    expect(res.body).toMatchObject({ companyId: "c1", name: "Do'kon 1" });
  });
});

describe("GET /api/v1/sale-points", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("ro'yxatni qaytaradi", async () => {
    fakeTx.salePoint.findMany.mockResolvedValue([{ id: "sp1", name: "Do'kon 1" }]);

    const res = await request(createApp())
      .get("/api/v1/sale-points")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.salePoints).toEqual([{ id: "sp1", name: "Do'kon 1" }]);
  });
});

describe("POST /api/v1/sale-points/:id/operators", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("sotuv nuqtasi topilmasa 404 qaytaradi", async () => {
    fakeTx.salePoint.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/sale-points/sp1/operators")
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "+998901112233" });

    expect(res.status).toBe(404);
  });

  it("bu raqamda foydalanuvchi topilmasa 404 qaytaradi", async () => {
    fakeTx.salePoint.findUnique.mockResolvedValue({ id: "sp1" });
    fakeTx.user.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/sale-points/sp1/operators")
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "+998901112233" });

    expect(res.status).toBe(404);
  });

  it("mavjud bo'lsa 201 bilan biriktiradi", async () => {
    fakeTx.salePoint.findUnique.mockResolvedValue({ id: "sp1" });
    fakeTx.user.findUnique.mockResolvedValue({ id: "u2", phone: "+998901112233" });
    fakeTx.companyMember.findUnique.mockResolvedValue({ id: "cm1" });
    fakeTx.userAssignment.findFirst.mockResolvedValue(null);
    fakeTx.userAssignment.create.mockImplementation((args) => Promise.resolve(args.data));

    const res = await request(createApp())
      .post("/api/v1/sale-points/sp1/operators")
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "+998901112233" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      companyMemberId: "cm1",
      targetType: "sale_point",
      targetId: "sp1",
    });
  });
});
