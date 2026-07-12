import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  pushSubscription: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
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

describe("POST /api/v1/push-subscriptions", () => {
  beforeEach(() => resetFakeTx());

  const dto = { endpoint: "https://push.example/1", keys: { p256dh: "p", auth: "a" } };

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/push-subscriptions").send(dto);
    expect(res.status).toBe(401);
  });

  it("noto'g'ri body bilan 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/push-subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint: "not-a-url" });

    expect(res.status).toBe(400);
  });

  it("to'g'ri holatda 201 qaytaradi", async () => {
    fakeTx.pushSubscription.upsert.mockImplementation((args) =>
      Promise.resolve({ id: "ps1", ...args.create }),
    );

    const res = await request(createApp())
      .post("/api/v1/push-subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send(dto);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: "u1", endpoint: dto.endpoint });
  });
});

describe("DELETE /api/v1/push-subscriptions/:id", () => {
  beforeEach(() => resetFakeTx());

  it("boshqa foydalanuvchining obunasi bo'lsa 404 qaytaradi", async () => {
    fakeTx.pushSubscription.findUnique.mockResolvedValue({ id: "ps1", userId: "u2" });

    const res = await request(createApp())
      .delete("/api/v1/push-subscriptions/ps1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(fakeTx.pushSubscription.delete).not.toHaveBeenCalled();
  });

  it("o'z obunasini o'chiradi, 204 qaytaradi", async () => {
    fakeTx.pushSubscription.findUnique.mockResolvedValue({ id: "ps1", userId: "u1" });
    fakeTx.pushSubscription.delete.mockResolvedValue({});

    const res = await request(createApp())
      .delete("/api/v1/push-subscriptions/ps1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });
});
