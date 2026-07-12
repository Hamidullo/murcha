import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const ORDER_ID = "11111111-1111-7111-8111-111111111111";
const COURIER_MEMBER_ID = "22222222-2222-7222-8222-222222222222";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  delivery: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  deliveryOrder: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  order: { findUnique: vi.fn(), update: vi.fn() },
  orderStatusHistory: { create: vi.fn() },
  companyMember: { findUnique: vi.fn() },
  rolePermission: { findFirst: vi.fn() },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
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

describe("POST /api/v1/deliveries", () => {
  beforeEach(() => resetFakeTx());

  const body = { courierMemberId: COURIER_MEMBER_ID, orderIds: [ORDER_ID] };

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/deliveries").send(body);
    expect(res.status).toBe(401);
  });

  it("deliveries.manage ruxsati bo'lmasa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/deliveries")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(403);
  });

  it("to'g'ri holatda 201 bilan dostavka yaratadi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.companyMember.findUnique.mockResolvedValue({
      id: COURIER_MEMBER_ID,
      companyId: "c1",
    });
    fakeTx.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      companyId: "c1",
      status: "shipped",
      number: "1",
      total: 100,
    });
    fakeTx.delivery.create.mockResolvedValue({ id: "d1" });
    fakeTx.delivery.findUnique.mockResolvedValue({ id: "d1", status: "assigned" });

    const res = await request(createApp())
      .post("/api/v1/deliveries")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(201);
    expect(fakeTx.deliveryOrder.create).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/v1/deliveries", () => {
  beforeEach(() => resetFakeTx());

  it("ruxsat bo'lmasa faqat o'z (kuryer) dostavkalarini qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);
    fakeTx.companyMember.findUnique.mockResolvedValue({ id: "m1" });
    fakeTx.delivery.findMany.mockResolvedValue([]);

    const res = await request(createApp())
      .get("/api/v1/deliveries")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deliveries: [] });
  });
});

describe("GET /api/v1/deliveries/:id", () => {
  beforeEach(() => resetFakeTx());

  it("topilmasa 404 qaytaradi", async () => {
    fakeTx.delivery.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/deliveries/d1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/deliveries/:id/orders/:orderId/deliver", () => {
  beforeEach(() => resetFakeTx());

  it("boshqa kuryer chaqirsa 404 qaytaradi", async () => {
    fakeTx.delivery.findUnique.mockResolvedValue({
      id: "d1",
      companyId: "c1",
      courierMemberId: "someone-else",
      orders: [],
    });
    fakeTx.companyMember.findUnique.mockResolvedValue({ id: "m1" });

    const res = await request(createApp())
      .post(`/api/v1/deliveries/d1/orders/${ORDER_ID}/deliver`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(404);
  });

  it("o'z bekatini yetkazildi deb belgilaydi, 200 qaytaradi", async () => {
    fakeTx.delivery.findUnique.mockResolvedValue({
      id: "d1",
      companyId: "c1",
      courierMemberId: "m1",
      orders: [
        {
          id: "do1",
          orderId: ORDER_ID,
          deliveredAt: null,
          order: { status: "shipped", total: 100 },
        },
      ],
    });
    fakeTx.companyMember.findUnique.mockResolvedValue({ id: "m1" });
    fakeTx.deliveryOrder.update.mockResolvedValue({ id: "do1", acceptCode: "1234" });
    fakeTx.delivery.update.mockResolvedValue({});

    const res = await request(createApp())
      .post(`/api/v1/deliveries/d1/orders/${ORDER_ID}/deliver`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(fakeTx.order.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { status: "delivered" },
    });
  });
});
