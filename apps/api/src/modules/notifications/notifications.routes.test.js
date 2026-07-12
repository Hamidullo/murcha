import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  notification: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
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

describe("GET /api/v1/notifications", () => {
  beforeEach(() => resetFakeTx());

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).get("/api/v1/notifications");
    expect(res.status).toBe(401);
  });

  it("o'z bildirishnomalarini qaytaradi", async () => {
    fakeTx.notification.findMany.mockResolvedValue([{ id: "n1", userId: "u1" }]);

    const res = await request(createApp())
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.notifications).toEqual([{ id: "n1", userId: "u1" }]);
  });

  it("unreadOnly=true bo'lsa readAt:null filtri bilan so'raladi", async () => {
    fakeTx.notification.findMany.mockResolvedValue([]);

    const res = await request(createApp())
      .get("/api/v1/notifications?unreadOnly=true")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(fakeTx.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", readAt: null } }),
    );
  });
});

describe("PATCH /api/v1/notifications/:id/read", () => {
  beforeEach(() => resetFakeTx());

  it("boshqa foydalanuvchining bildirishnomasi bo'lsa 404 qaytaradi", async () => {
    fakeTx.notification.findUnique.mockResolvedValue({ id: "n1", userId: "u2" });

    const res = await request(createApp())
      .patch("/api/v1/notifications/n1/read")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(fakeTx.notification.update).not.toHaveBeenCalled();
  });

  it("o'z bildirishnomasini o'qilgan deb belgilaydi", async () => {
    fakeTx.notification.findUnique.mockResolvedValue({ id: "n1", userId: "u1" });
    fakeTx.notification.update.mockResolvedValue({ id: "n1", userId: "u1", readAt: new Date() });

    const res = await request(createApp())
      .patch("/api/v1/notifications/n1/read")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("n1");
  });
});
