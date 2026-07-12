import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {
  $executeRaw: vi.fn().mockResolvedValue(undefined),
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  company: { create: vi.fn(), findUnique: vi.fn() },
  role: { findFirst: vi.fn() },
  companyMember: { create: vi.fn(), findMany: vi.fn() },
  subscription: { create: vi.fn().mockResolvedValue({}) },
};

vi.mock("../../lib/prisma.js", () => ({
  prisma: { $transaction: vi.fn((callback) => callback(fakeTx)) },
}));
vi.mock("../../lib/password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

const sendSms = vi.fn().mockResolvedValue(undefined);
vi.mock("../../lib/sms.js", () => ({ sendSms: (...args) => sendSms(...args) }));

const fakeRedisMultiChain = {
  set: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};
const fakeRedis = {
  multi: vi.fn(() => fakeRedisMultiChain),
  get: vi.fn(),
  set: vi.fn().mockResolvedValue("OK"),
  del: vi.fn().mockResolvedValue(undefined),
  srem: vi.fn().mockResolvedValue(undefined),
  sadd: vi.fn().mockResolvedValue(1),
  smembers: vi.fn().mockResolvedValue([]),
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(undefined),
  hset: vi.fn().mockResolvedValue(1),
  hgetall: vi.fn().mockResolvedValue({}),
  hincrby: vi.fn().mockResolvedValue(1),
};
vi.mock("../../lib/redis.js", () => ({ redis: fakeRedis }));

const { createApp } = await import("../../app.js");
const { verifyPassword } = await import("../../lib/password.js");

const dto = {
  phone: "+998901234567",
  password: "Murcha2026!",
  fullName: "Test Foydalanuvchi",
  companyName: "Test Kompaniya",
};

describe("POST /api/v1/auth/register", () => {
  beforeEach(() => {
    fakeTx.user.findUnique.mockReset().mockResolvedValue(null);
    fakeTx.user.create.mockReset().mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.company.create.mockReset().mockImplementation((args) => Promise.resolve(args.data));
    fakeTx.role.findFirst.mockReset().mockResolvedValue({ id: "role-owner", name: "owner" });
    fakeTx.companyMember.create
      .mockReset()
      .mockImplementation((args) => Promise.resolve(args.data));
  });

  it("to'g'ri body bilan 201, sessiya cookie va accessToken qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/auth/register").send(dto);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ phone: dto.phone, fullName: dto.fullName });
    expect(res.body.company).toMatchObject({ name: dto.companyName });
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.headers["set-cookie"][0]).toMatch(/^murcha_rt=/);
    expect(fakeTx.subscription.create).toHaveBeenCalledTimes(1);
  });

  it("noto'g'ri telefon formatida 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/auth/register")
      .send({ ...dto, phone: "901234567" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("telefon band bo'lsa 409 qaytaradi", async () => {
    fakeTx.user.findUnique.mockResolvedValue({ id: "existing" });

    const res = await request(createApp()).post("/api/v1/auth/register").send(dto);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("conflict");
  });
});

describe("POST /api/v1/auth/login", () => {
  const loginDto = { phone: dto.phone, password: dto.password };
  const storedUser = { id: "u1", phone: dto.phone, fullName: dto.fullName, passwordHash: "hash" };

  beforeEach(() => {
    fakeTx.user.findUnique.mockReset().mockResolvedValue(storedUser);
    fakeTx.companyMember.findMany.mockReset();
    verifyPassword.mockReset().mockResolvedValue(true);
    fakeRedis.get.mockReset().mockResolvedValue(null);
    fakeRedis.incr.mockReset().mockResolvedValue(1);
  });

  it("bitta kompaniya bo'lsa 200 + accessToken + sessiya cookie qaytaradi", async () => {
    fakeTx.companyMember.findMany.mockResolvedValue([
      { companyId: "c1", roleId: "role-owner", company: { id: "c1", name: "Kompaniya" } },
    ]);

    const res = await request(createApp()).post("/api/v1/auth/login").send(loginDto);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("authenticated");
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.headers["set-cookie"][0]).toMatch(/^murcha_rt=/);
  });

  it("bir nechta kompaniya bo'lsa select_company + pendingToken qaytaradi, cookie qo'ymaydi", async () => {
    fakeTx.companyMember.findMany.mockResolvedValue([
      { companyId: "c1", roleId: "role-owner", company: { id: "c1", name: "A" } },
      { companyId: "c2", roleId: "role-manager", company: { id: "c2", name: "B" } },
    ]);

    const res = await request(createApp()).post("/api/v1/auth/login").send(loginDto);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("select_company");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("foydalanuvchi topilmasa 401 qaytaradi", async () => {
    fakeTx.user.findUnique.mockResolvedValue(null);

    const res = await request(createApp()).post("/api/v1/auth/login").send(loginDto);

    expect(res.status).toBe(401);
  });

  it("parol noto'g'ri bo'lsa 401 qaytaradi", async () => {
    verifyPassword.mockResolvedValue(false);

    const res = await request(createApp()).post("/api/v1/auth/login").send(loginDto);

    expect(res.status).toBe(401);
  });

  it("telefon bo'yicha 5 marta xato urinishdan keyin 403 qaytaradi", async () => {
    fakeRedis.get.mockResolvedValue("5");

    const res = await request(createApp()).post("/api/v1/auth/login").send(loginDto);

    expect(res.status).toBe(403);
  });

  it("IP bo'yicha limitdan oshsa 429 qaytaradi", async () => {
    fakeRedis.incr.mockResolvedValue(21);

    const res = await request(createApp()).post("/api/v1/auth/login").send(loginDto);

    expect(res.status).toBe(429);
  });
});

describe("POST /api/v1/auth/select-company", () => {
  it("noto'g'ri pendingToken'da 401 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/auth/select-company")
      .send({ pendingToken: "buzilgan", companyId: "00000000-0000-7000-8000-000000000001" });

    expect(res.status).toBe(401);
  });

  it("noto'g'ri body formatida 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/auth/select-company")
      .send({ pendingToken: "x", companyId: "not-a-uuid" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  beforeEach(() => {
    fakeRedis.get.mockReset();
  });

  it("cookie bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).post("/api/v1/auth/refresh");

    expect(res.status).toBe(401);
  });

  it("to'g'ri cookie bilan yangi accessToken + cookie qaytaradi", async () => {
    fakeRedis.get.mockImplementation((key) => {
      if (key === "refresh:s1") return Promise.resolve("old-rt");
      if (key === "session:s1")
        return Promise.resolve(JSON.stringify({ userId: "u1", companyId: "c1", roleId: "r1" }));
      return Promise.resolve(null);
    });

    const res = await request(createApp())
      .post("/api/v1/auth/refresh")
      .set("Cookie", "murcha_rt=s1.old-rt");

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.headers["set-cookie"][0]).toMatch(/^murcha_rt=s1\./);
  });

  it("token mos kelmasa (reuse) 401 qaytaradi", async () => {
    fakeRedis.get.mockImplementation((key) => {
      if (key === "refresh:s1") return Promise.resolve("boshqa-token");
      if (key === "session:s1") return Promise.resolve(JSON.stringify({ userId: "u1" }));
      return Promise.resolve(null);
    });

    const res = await request(createApp())
      .post("/api/v1/auth/refresh")
      .set("Cookie", "murcha_rt=s1.old-rt");

    expect(res.status).toBe(401);
    expect(fakeRedis.del).toHaveBeenCalledWith("session:s1", "refresh:s1");
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("sessiyani bekor qilib 204 va bo'sh cookie qaytaradi", async () => {
    fakeRedis.get.mockResolvedValue(JSON.stringify({ userId: "u1" }));

    const res = await request(createApp())
      .post("/api/v1/auth/logout")
      .set("Cookie", "murcha_rt=s1.rt");

    expect(res.status).toBe(204);
    expect(fakeRedis.del).toHaveBeenCalledWith("session:s1", "refresh:s1");
    expect(res.headers["set-cookie"][0]).toMatch(/^murcha_rt=;/);
  });
});

describe("GET /api/v1/auth/sessions", () => {
  it("cookie bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).get("/api/v1/auth/sessions");

    expect(res.status).toBe(401);
  });

  it("joriy sessiya asosida ro'yxat qaytaradi", async () => {
    fakeRedis.get.mockImplementation((key) => {
      if (key === "session:s1") return Promise.resolve(JSON.stringify({ userId: "u1" }));
      return Promise.resolve(null);
    });
    fakeRedis.smembers.mockResolvedValue(["s1"]);

    const res = await request(createApp())
      .get("/api/v1/auth/sessions")
      .set("Cookie", "murcha_rt=s1.rt");

    expect(res.status).toBe(200);
    expect(res.body.sessions).toEqual([
      { id: "s1", userAgent: null, ip: null, createdAt: undefined, current: true },
    ]);
  });
});

describe("DELETE /api/v1/auth/sessions/:id", () => {
  it("boshqa foydalanuvchi sessiyasini o'chirishga urinsa 404 qaytaradi", async () => {
    fakeRedis.get.mockImplementation((key) => {
      if (key === "session:s1") return Promise.resolve(JSON.stringify({ userId: "u1" }));
      if (key === "session:s2") return Promise.resolve(JSON.stringify({ userId: "u2" }));
      return Promise.resolve(null);
    });

    const res = await request(createApp())
      .delete("/api/v1/auth/sessions/s2")
      .set("Cookie", "murcha_rt=s1.rt");

    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("Authorization header bo'lmasa 401 qaytaradi", async () => {
    const res = await request(createApp()).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
  });

  it("to'g'ri access token bilan user/company/roleId qaytaradi", async () => {
    const { signAccessToken } = await import("../../lib/jwt.js");
    const token = signAccessToken({ userId: "u1", companyId: "c1", roleId: "r1" });
    fakeTx.user.findUnique.mockReset().mockResolvedValue({
      id: "u1",
      phone: "+998901234567",
      fullName: "Test",
    });
    fakeTx.company.findUnique.mockReset().mockResolvedValue({ id: "c1", name: "Kompaniya" });

    const res = await request(createApp())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: { id: "u1", phone: "+998901234567", fullName: "Test" },
      company: { id: "c1", name: "Kompaniya" },
      roleId: "r1",
    });
  });
});

describe("POST /api/v1/auth/set-password", () => {
  beforeEach(() => {
    fakeRedis.get.mockReset();
    fakeRedis.del.mockReset().mockResolvedValue(undefined);
    fakeTx.user.update.mockReset().mockResolvedValue({ id: "u1" });
  });

  it("noto'g'ri parol uzunligida 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/auth/set-password")
      .send({ token: "tok1", password: "qisqa" });

    expect(res.status).toBe(400);
  });

  it("token yaroqsiz bo'lsa 401 qaytaradi", async () => {
    fakeRedis.get.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/auth/set-password")
      .send({ token: "tok1", password: "Murcha2026!" });

    expect(res.status).toBe(401);
  });

  it("to'g'ri tokenda 204 qaytaradi", async () => {
    fakeRedis.get.mockResolvedValue("u1");
    fakeRedis.smembers.mockResolvedValue([]);

    const res = await request(createApp())
      .post("/api/v1/auth/set-password")
      .send({ token: "tok1", password: "Murcha2026!" });

    expect(res.status).toBe(204);
    expect(fakeRedis.del).toHaveBeenCalledWith("pwreset:tok1");
    expect(fakeTx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: expect.objectContaining({ passwordHash: "hashed-password" }),
    });
  });
});

describe("POST /api/v1/auth/forgot-password", () => {
  beforeEach(() => {
    sendSms.mockClear();
    fakeTx.user.findUnique.mockReset();
    fakeRedis.hset.mockReset().mockResolvedValue(1);
    fakeRedis.expire.mockReset().mockResolvedValue(undefined);
    fakeRedis.incr.mockReset().mockResolvedValue(1);
  });

  it("noto'g'ri telefon formatida 400 qaytaradi", async () => {
    const res = await request(createApp())
      .post("/api/v1/auth/forgot-password")
      .send({ phone: "901234567" });

    expect(res.status).toBe(400);
  });

  it("telefon ro'yxatdan o'tmagan bo'lsa ham 204 qaytaradi (oshkor qilmaydi), SMS yubormaydi", async () => {
    fakeTx.user.findUnique.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/v1/auth/forgot-password")
      .send({ phone: "+998901234567" });

    expect(res.status).toBe(204);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("telefon mavjud bo'lsa 204 qaytaradi va SMS yuboradi", async () => {
    fakeTx.user.findUnique.mockResolvedValue({ id: "u1", phone: "+998901234567" });

    const res = await request(createApp())
      .post("/api/v1/auth/forgot-password")
      .send({ phone: "+998901234567" });

    expect(res.status).toBe(204);
    expect(sendSms).toHaveBeenCalledWith("+998901234567", expect.any(String));
  });
});

describe("POST /api/v1/auth/reset-password", () => {
  beforeEach(() => {
    fakeTx.user.findUnique.mockReset();
    fakeTx.user.update.mockReset().mockResolvedValue({ id: "u1" });
    fakeRedis.hgetall.mockReset();
    fakeRedis.hincrby.mockReset().mockResolvedValue(1);
    fakeRedis.del.mockReset().mockResolvedValue(undefined);
    fakeRedis.smembers.mockReset().mockResolvedValue([]);
  });

  it("kod topilmasa 401 qaytaradi", async () => {
    fakeRedis.hgetall.mockResolvedValue({});

    const res = await request(createApp())
      .post("/api/v1/auth/reset-password")
      .send({ phone: "+998901234567", code: "123456", password: "Murcha2026!" });

    expect(res.status).toBe(401);
  });

  it("kod noto'g'ri bo'lsa 401 qaytaradi", async () => {
    fakeRedis.hgetall.mockResolvedValue({ code: "000000", attempts: "0" });

    const res = await request(createApp())
      .post("/api/v1/auth/reset-password")
      .send({ phone: "+998901234567", code: "123456", password: "Murcha2026!" });

    expect(res.status).toBe(401);
    expect(fakeRedis.hincrby).toHaveBeenCalled();
  });

  it("urinish limitidan oshsa 403 qaytaradi", async () => {
    fakeRedis.hgetall.mockResolvedValue({ code: "123456", attempts: "3" });

    const res = await request(createApp())
      .post("/api/v1/auth/reset-password")
      .send({ phone: "+998901234567", code: "123456", password: "Murcha2026!" });

    expect(res.status).toBe(403);
  });

  it("to'g'ri kodda 204 qaytaradi", async () => {
    fakeRedis.hgetall.mockResolvedValue({ code: "123456", attempts: "0" });
    fakeTx.user.findUnique.mockResolvedValue({ id: "u1", phone: "+998901234567" });

    const res = await request(createApp())
      .post("/api/v1/auth/reset-password")
      .send({ phone: "+998901234567", code: "123456", password: "Murcha2026!" });

    expect(res.status).toBe(204);
    expect(fakeRedis.del).toHaveBeenCalledWith("otp:+998901234567");
  });
});
