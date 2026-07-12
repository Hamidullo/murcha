import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  auditLog: { findMany: vi.fn() },
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

describe("GET /api/v1/audit-logs", () => {
  beforeEach(() => resetFakeTx());

  it("audit.view ruxsati yo'q bo'lsa 403 qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("audit.view ruxsati bo'lsa 200 va ro'yxatni qaytaradi", async () => {
    fakeTx.rolePermission.findFirst.mockResolvedValue({ id: "rp1" });
    fakeTx.auditLog.findMany.mockResolvedValue([{ id: "a1" }]);

    const res = await request(createApp())
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ logs: [{ id: "a1" }] });
  });
});
