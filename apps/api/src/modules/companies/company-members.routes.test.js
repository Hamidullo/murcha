import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  companyMember: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  role: {
    findUnique: vi.fn(),
  },
  userAssignment: {
    create: vi.fn(),
  },
};
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));

const fakeRedis = {
  smembers: vi.fn().mockResolvedValue([]),
  del: vi.fn().mockResolvedValue(undefined),
  srem: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  set: vi.fn().mockResolvedValue("OK"),
};
vi.mock("../../lib/redis.js", () => ({ redis: fakeRedis }));

const sendSms = vi.fn().mockResolvedValue(undefined);
vi.mock("../../lib/sms.js", () => ({ sendSms: (...args) => sendSms(...args) }));

const hasPermission = vi.fn().mockResolvedValue(true);
vi.mock("../roles/roles.repository.js", async (importOriginal) => {
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

describe("POST /api/v1/company-members", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  const body = {
    phone: "+998901112233",
    fullName: "Aziz Karimov",
    roleId: "11111111-1111-7111-8111-111111111111",
  };

  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/company-members").send(body);
    expect(res.status).toBe(401);
  });

  it("ruxsat bo'lmasa 403 qaytaradi", async () => {
    hasPermission.mockResolvedValue(false);

    const res = await request(createApp())
      .post("/api/v1/company-members")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(403);
  });

  it("rol topilmasa 404 qaytaradi", async () => {
    fakeTx.role.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/company-members")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(404);
  });

  it("to'g'ri holatda 201 bilan hodim yaratadi va taklif SMS yuboradi", async () => {
    fakeTx.role.findUnique.mockResolvedValue({
      id: body.roleId,
      companyId: null,
      name: "Sotuvchi",
    });
    fakeTx.user.findUnique.mockResolvedValue(null);
    fakeTx.user.create.mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.companyMember.create.mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.companyMember.findUnique
      .mockResolvedValueOnce(null) // findByCompanyAndUser — dublikat emas
      .mockResolvedValueOnce({
        id: "cm1",
        userId: "u-new",
        user: { id: "u-new", phone: body.phone },
        role: { id: body.roleId, name: "Sotuvchi" },
      }); // findById — yaratilgandan keyin SMS uchun

    const res = await request(createApp())
      .post("/api/v1/company-members")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(201);
    expect(sendSms).toHaveBeenCalledWith(body.phone, expect.any(String));
  });
});

describe("PATCH /api/v1/company-members/:id", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
  });

  it("bloklashda 200 qaytaradi", async () => {
    fakeTx.companyMember.findUnique.mockResolvedValue({
      id: "cm1",
      companyId: "c1",
      userId: "u9",
    });
    fakeTx.companyMember.update.mockResolvedValue({ id: "cm1", status: "blocked" });

    const res = await request(createApp())
      .patch("/api/v1/company-members/cm1")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "blocked" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "blocked" });
  });
});

describe("POST /api/v1/company-members/:id/reset-password", () => {
  beforeEach(() => {
    resetFakeTx();
    hasPermission.mockReset().mockResolvedValue(true);
    sendSms.mockClear();
  });

  it("hodim topilmasa 404 qaytaradi", async () => {
    fakeTx.companyMember.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/company-members/cm1/reset-password")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("to'g'ri holatda 204 qaytaradi va SMS yuboradi", async () => {
    fakeTx.companyMember.findUnique
      .mockResolvedValueOnce({ id: "cm1", companyId: "c1", userId: "u9" })
      .mockResolvedValueOnce({
        id: "cm1",
        userId: "u9",
        user: { id: "u9", phone: "+998901112233" },
      });
    fakeTx.user.update.mockResolvedValue({ id: "u9" });

    const res = await request(createApp())
      .post("/api/v1/company-members/cm1/reset-password")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(sendSms).toHaveBeenCalledWith("+998901112233", expect.any(String));
  });
});
