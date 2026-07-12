import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const COUNTERPARTY_ID = "11111111-1111-7111-8111-111111111111";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  counterparty: { findUnique: vi.fn() },
  payment: { create: vi.fn() },
  paymentAllocation: { create: vi.fn() },
  debtMovement: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
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

describe("POST /api/v1/payments", () => {
  beforeEach(() => resetFakeTx());

  const body = { counterpartyId: COUNTERPARTY_ID, amount: 1000, currency: "UZS", method: "cash" };

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/payments").send(body);
    expect(res.status).toBe(401);
  });

  it("debts.manage ruxsati bo'lmasa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(403);
  });

  it("kontragent topilmasa 404 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.counterparty.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(404);
  });

  it("to'g'ri holatda 201 bilan to'lov yaratadi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.counterparty.findUnique.mockResolvedValue({ id: COUNTERPARTY_ID, companyId: "c1" });
    fakeTx.payment.create.mockResolvedValue({ id: "pay1", ...body });
    fakeTx.debtMovement.findMany.mockResolvedValue([]);

    const res = await request(createApp())
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(201);
    expect(fakeTx.debtMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orderId: null, amount: -1000 }) }),
    );
  });
});
