import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = { subscription: { create: vi.fn().mockResolvedValue({}) } };
vi.mock("../../lib/tenant-context.js", () => ({
  withTenant: vi.fn((_companyId, _userId, callback) => callback(fakeTx)),
  withUserContext: vi.fn((_userId, callback) => callback(fakeTx)),
  withoutTenant: vi.fn((callback) => callback(fakeTx)),
}));
vi.mock("../../lib/password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));
vi.mock("../../lib/opaque-token.js", () => ({
  generateOpaqueToken: vi.fn(() => "opaque-token"),
}));
const sendSms = vi.fn().mockResolvedValue(undefined);
vi.mock("../../lib/sms.js", () => ({ sendSms: (...args) => sendSms(...args) }));

const { AuthService } = await import("./auth.service.js");
const { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } =
  await import("../../lib/errors.js");
const { verifyPassword } = await import("../../lib/password.js");
const { verifyToken } = await import("../../lib/jwt.js");

function makeDeps() {
  return {
    usersRepository: {
      findByPhone: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      create: vi.fn().mockImplementation((_tx, data) => Promise.resolve(data)),
      update: vi.fn().mockImplementation((_tx, id, data) => Promise.resolve({ id, ...data })),
    },
    companiesRepository: {
      create: vi.fn().mockImplementation((_tx, data) => Promise.resolve(data)),
      findById: vi.fn(),
    },
    companyMembersRepository: {
      create: vi.fn().mockImplementation((_tx, data) => Promise.resolve(data)),
      findByUserId: vi.fn().mockResolvedValue([]),
    },
    rolesRepository: {
      findSystemRoleByName: vi.fn().mockResolvedValue({ id: "role-owner", name: "owner" }),
    },
    sessionsRepository: {
      create: vi.fn().mockResolvedValue(undefined),
      getSession: vi.fn(),
      getRefreshToken: vi.fn(),
      rotateRefreshToken: vi.fn().mockResolvedValue(undefined),
      revoke: vi.fn().mockResolvedValue(undefined),
      listByUser: vi.fn().mockResolvedValue([]),
    },
    loginAttemptsRepository: {
      getFailureCount: vi.fn().mockResolvedValue(0),
      recordFailure: vi.fn().mockResolvedValue(1),
      reset: vi.fn().mockResolvedValue(undefined),
    },
    passwordResetRepository: {
      createToken: vi.fn().mockResolvedValue("reset-token"),
      consumeToken: vi.fn().mockResolvedValue("u1"),
    },
    otpRepository: {
      create: vi.fn().mockResolvedValue("123456"),
      get: vi.fn().mockResolvedValue({ code: "123456", attempts: 0 }),
      incrementAttempts: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  };
}

const registerDto = {
  phone: "+998901234567",
  password: "Murcha2026!",
  fullName: "Test Foydalanuvchi",
  companyName: "Test Kompaniya",
};

describe("AuthService.registerCompany", () => {
  beforeEach(() => {
    fakeTx.subscription.create.mockClear();
  });

  it("user + company + owner a'zolik + subscription + sessiya yaratadi", async () => {
    const deps = makeDeps();
    const service = new AuthService(deps);

    const result = await service.registerCompany(registerDto);

    expect(deps.usersRepository.findByPhone).toHaveBeenCalledWith(fakeTx, registerDto.phone);
    expect(deps.rolesRepository.findSystemRoleByName).toHaveBeenCalledWith(fakeTx, "owner");
    expect(fakeTx.subscription.create).toHaveBeenCalledTimes(1);
    expect(deps.sessionsRepository.create).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("authenticated");
    expect(result.sessionId).toEqual(expect.any(String));
    expect(result.refreshToken).toBe("opaque-token");
    expect(result.user).toEqual({
      id: expect.any(String),
      phone: registerDto.phone,
      fullName: registerDto.fullName,
    });
    expect(result.company.name).toBe(registerDto.companyName);
  });

  it("telefon band bo'lsa ConflictError otadi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findByPhone.mockResolvedValue({ id: "existing" });
    const service = new AuthService(deps);

    await expect(service.registerCompany(registerDto)).rejects.toBeInstanceOf(ConflictError);
    expect(deps.companiesRepository.create).not.toHaveBeenCalled();
  });

  it("'owner' tizim roli topilmasa xato otadi", async () => {
    const deps = makeDeps();
    deps.rolesRepository.findSystemRoleByName.mockResolvedValue(null);
    const service = new AuthService(deps);

    await expect(service.registerCompany(registerDto)).rejects.toThrow(/owner/);
  });
});

const loginDto = { phone: "+998901234567", password: "Murcha2026!" };
const user = { id: "u1", phone: loginDto.phone, fullName: "Test", passwordHash: "hash" };

describe("AuthService.login", () => {
  beforeEach(() => {
    verifyPassword.mockClear().mockResolvedValue(true);
  });

  it("telefon topilmasa UnauthorizedError otadi va urinish yoziladi", async () => {
    const deps = makeDeps();
    const service = new AuthService(deps);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(deps.loginAttemptsRepository.recordFailure).toHaveBeenCalledWith(loginDto.phone);
  });

  it("parol noto'g'ri bo'lsa UnauthorizedError otadi va urinish yoziladi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findByPhone.mockResolvedValue(user);
    verifyPassword.mockResolvedValue(false);
    const service = new AuthService(deps);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(deps.loginAttemptsRepository.recordFailure).toHaveBeenCalledWith(loginDto.phone);
  });

  it("5 marta xato urinishdan keyin ForbiddenError bilan bloklanadi", async () => {
    const deps = makeDeps();
    deps.loginAttemptsRepository.getFailureCount.mockResolvedValue(5);
    const service = new AuthService(deps);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(ForbiddenError);
    expect(deps.usersRepository.findByPhone).not.toHaveBeenCalled();
  });

  it("a'zolik yo'q bo'lsa ForbiddenError otadi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findByPhone.mockResolvedValue(user);
    deps.companyMembersRepository.findByUserId.mockResolvedValue([]);
    const service = new AuthService(deps);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("bitta kompaniya bo'lsa sessiya + access token qaytaradi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findByPhone.mockResolvedValue(user);
    deps.companyMembersRepository.findByUserId.mockResolvedValue([
      { companyId: "c1", roleId: "role-owner", company: { id: "c1", name: "Kompaniya" } },
    ]);
    const service = new AuthService(deps);

    const result = await service.login(loginDto);

    expect(result.status).toBe("authenticated");
    expect(result.refreshToken).toBe("opaque-token");
    expect(deps.loginAttemptsRepository.reset).toHaveBeenCalledWith(loginDto.phone);
    expect(deps.sessionsRepository.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ userId: "u1", companyId: "c1", roleId: "role-owner" }),
    );
    const decoded = verifyToken(result.accessToken);
    expect(decoded).toMatchObject({
      userId: "u1",
      companyId: "c1",
      roleId: "role-owner",
      type: "access",
    });
  });

  it("bir nechta kompaniya bo'lsa pendingToken + ro'yxat qaytaradi, sessiya ochmaydi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findByPhone.mockResolvedValue(user);
    deps.companyMembersRepository.findByUserId.mockResolvedValue([
      { companyId: "c1", roleId: "role-owner", company: { id: "c1", name: "A" } },
      { companyId: "c2", roleId: "role-manager", company: { id: "c2", name: "B" } },
    ]);
    const service = new AuthService(deps);

    const result = await service.login(loginDto);

    expect(result.status).toBe("select_company");
    expect(deps.sessionsRepository.create).not.toHaveBeenCalled();
    const decoded = verifyToken(result.pendingToken);
    expect(decoded).toMatchObject({ userId: "u1", type: "pending" });
  });
});

describe("AuthService.selectCompany", () => {
  it("noto'g'ri/buzilgan pendingToken'da UnauthorizedError otadi", async () => {
    const deps = makeDeps();
    const service = new AuthService(deps);

    await expect(
      service.selectCompany({ pendingToken: "buzilgan", companyId: "c1" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("access token'ni pendingToken sifatida bersa rad etadi (type mos emas)", async () => {
    const deps = makeDeps();
    const service = new AuthService(deps);
    const { signAccessToken } = await import("../../lib/jwt.js");
    const accessToken = signAccessToken({ userId: "u1", companyId: "c1", roleId: "r1" });

    await expect(
      service.selectCompany({ pendingToken: accessToken, companyId: "c1" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("a'zo bo'lmagan companyId uchun ForbiddenError otadi", async () => {
    const deps = makeDeps();
    deps.companyMembersRepository.findByUserId.mockResolvedValue([
      { companyId: "c1", roleId: "role-owner", company: { id: "c1", name: "A" } },
    ]);
    const service = new AuthService(deps);
    const { signPendingToken } = await import("../../lib/jwt.js");
    const pendingToken = signPendingToken({ userId: "u1" });

    await expect(
      service.selectCompany({ pendingToken, companyId: "c-noma-lum" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("to'g'ri companyId uchun sessiya + access token qaytaradi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findById.mockResolvedValue(user);
    deps.companyMembersRepository.findByUserId.mockResolvedValue([
      { companyId: "c2", roleId: "role-manager", company: { id: "c2", name: "B" } },
    ]);
    const service = new AuthService(deps);
    const { signPendingToken } = await import("../../lib/jwt.js");
    const pendingToken = signPendingToken({ userId: "u1" });

    const result = await service.selectCompany({ pendingToken, companyId: "c2" });

    expect(result.status).toBe("authenticated");
    expect(result.company).toEqual({ id: "c2", name: "B" });
    const decoded = verifyToken(result.accessToken);
    expect(decoded).toMatchObject({ userId: "u1", companyId: "c2", roleId: "role-manager" });
  });
});

describe("AuthService.refresh", () => {
  it("sessiya topilmasa UnauthorizedError otadi", async () => {
    const deps = makeDeps();
    deps.sessionsRepository.getRefreshToken.mockResolvedValue(null);
    const service = new AuthService(deps);

    await expect(service.refresh({ sessionId: "s1", refreshToken: "rt" })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("token mos kelmasa (reuse) sessiyani bekor qiladi va UnauthorizedError otadi", async () => {
    const deps = makeDeps();
    deps.sessionsRepository.getRefreshToken.mockResolvedValue("boshqa-token");
    deps.sessionsRepository.getSession.mockResolvedValue({ userId: "u1" });
    const service = new AuthService(deps);

    await expect(service.refresh({ sessionId: "s1", refreshToken: "rt" })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(deps.sessionsRepository.revoke).toHaveBeenCalledWith("s1", "u1");
  });

  it("token mos kelsa yangi refresh token bilan rotate qiladi", async () => {
    const deps = makeDeps();
    deps.sessionsRepository.getRefreshToken.mockResolvedValue("rt");
    deps.sessionsRepository.getSession.mockResolvedValue({
      userId: "u1",
      companyId: "c1",
      roleId: "role-owner",
    });
    const service = new AuthService(deps);

    const result = await service.refresh({ sessionId: "s1", refreshToken: "rt" });

    expect(deps.sessionsRepository.rotateRefreshToken).toHaveBeenCalledWith("s1", "opaque-token");
    expect(result.refreshToken).toBe("opaque-token");
    const decoded = verifyToken(result.accessToken);
    expect(decoded).toMatchObject({ userId: "u1", companyId: "c1", roleId: "role-owner" });
  });
});

describe("AuthService.logout", () => {
  it("sessiyani userId bilan bekor qiladi", async () => {
    const deps = makeDeps();
    deps.sessionsRepository.getSession.mockResolvedValue({ userId: "u1" });
    const service = new AuthService(deps);

    await service.logout({ sessionId: "s1" });

    expect(deps.sessionsRepository.revoke).toHaveBeenCalledWith("s1", "u1");
  });
});

describe("AuthService.listSessions", () => {
  it("joriy sessiya topilmasa UnauthorizedError otadi", async () => {
    const deps = makeDeps();
    deps.sessionsRepository.getSession.mockResolvedValue(null);
    const service = new AuthService(deps);

    await expect(service.listSessions({ sessionId: "s1" })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("foydalanuvchining barcha sessiyalarini current belgisi bilan qaytaradi", async () => {
    const deps = makeDeps();
    deps.sessionsRepository.getSession.mockResolvedValue({ userId: "u1" });
    deps.sessionsRepository.listByUser.mockResolvedValue([
      { id: "s1", userAgent: "curl", ip: "127.0.0.1", createdAt: "t1" },
      { id: "s2", createdAt: "t2" },
    ]);
    const service = new AuthService(deps);

    const result = await service.listSessions({ sessionId: "s1" });

    expect(deps.sessionsRepository.listByUser).toHaveBeenCalledWith("u1");
    expect(result).toEqual([
      { id: "s1", userAgent: "curl", ip: "127.0.0.1", createdAt: "t1", current: true },
      { id: "s2", userAgent: null, ip: null, createdAt: "t2", current: false },
    ]);
  });
});

describe("AuthService.revokeSession", () => {
  it("joriy sessiya topilmasa UnauthorizedError otadi", async () => {
    const deps = makeDeps();
    deps.sessionsRepository.getSession.mockResolvedValue(null);
    const service = new AuthService(deps);

    await expect(service.revokeSession({ sessionId: "s1" }, "s2")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("boshqa foydalanuvchining sessiyasini bekor qilishga urinsa NotFoundError otadi", async () => {
    const deps = makeDeps();
    deps.sessionsRepository.getSession
      .mockResolvedValueOnce({ userId: "u1" })
      .mockResolvedValueOnce({ userId: "u2" });
    const service = new AuthService(deps);

    await expect(service.revokeSession({ sessionId: "s1" }, "s2")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(deps.sessionsRepository.revoke).not.toHaveBeenCalled();
  });

  it("o'z sessiyasini bekor qiladi", async () => {
    const deps = makeDeps();
    deps.sessionsRepository.getSession
      .mockResolvedValueOnce({ userId: "u1" })
      .mockResolvedValueOnce({ userId: "u1" });
    const service = new AuthService(deps);

    await service.revokeSession({ sessionId: "s1" }, "s2");

    expect(deps.sessionsRepository.revoke).toHaveBeenCalledWith("s2", "u1");
  });
});

describe("AuthService.getCurrentUser", () => {
  it("foydalanuvchi topilmasa UnauthorizedError otadi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findById.mockResolvedValue(null);
    const service = new AuthService(deps);

    await expect(
      service.getCurrentUser({ userId: "u1", companyId: "c1", roleId: "r1" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("user + company + roleId qaytaradi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findById.mockResolvedValue(user);
    deps.companiesRepository.findById.mockResolvedValue({ id: "c1", name: "Kompaniya" });
    const service = new AuthService(deps);

    const result = await service.getCurrentUser({ userId: "u1", companyId: "c1", roleId: "r1" });

    expect(result).toEqual({
      user: { id: "u1", phone: user.phone, fullName: user.fullName },
      company: { id: "c1", name: "Kompaniya" },
      roleId: "r1",
    });
  });

  it("company topilmasa null qaytaradi (o'chirilgan/mavjud emas)", async () => {
    const deps = makeDeps();
    deps.usersRepository.findById.mockResolvedValue(user);
    deps.companiesRepository.findById.mockResolvedValue(null);
    const service = new AuthService(deps);

    const result = await service.getCurrentUser({ userId: "u1", companyId: "c1", roleId: "r1" });

    expect(result.company).toBeNull();
  });
});

describe("AuthService.setPassword", () => {
  it("token yaroqsiz bo'lsa UnauthorizedError otadi", async () => {
    const deps = makeDeps();
    deps.passwordResetRepository.consumeToken.mockResolvedValue(null);
    const service = new AuthService(deps);

    await expect(
      service.setPassword({ token: "bad", password: "Murcha2026!" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(deps.usersRepository.update).not.toHaveBeenCalled();
  });

  it("to'g'ri tokenda parolni yangilaydi va barcha sessiyalarni bekor qiladi", async () => {
    const deps = makeDeps();
    deps.passwordResetRepository.consumeToken.mockResolvedValue("u1");
    deps.sessionsRepository.listByUser.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
    const service = new AuthService(deps);

    await service.setPassword({ token: "good", password: "Murcha2026!" });

    expect(deps.usersRepository.update).toHaveBeenCalledWith(
      fakeTx,
      "u1",
      expect.objectContaining({ passwordHash: "hashed-password" }),
    );
    expect(deps.sessionsRepository.revoke).toHaveBeenCalledWith("s1", "u1");
    expect(deps.sessionsRepository.revoke).toHaveBeenCalledWith("s2", "u1");
  });
});

describe("AuthService.forgotPassword", () => {
  beforeEach(() => sendSms.mockClear());

  it("telefon ro'yxatdan o'tmagan bo'lsa jim qaytadi, SMS yubormaydi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findByPhone.mockResolvedValue(null);
    const service = new AuthService(deps);

    await service.forgotPassword({ phone: "+998901234567" });

    expect(deps.otpRepository.create).not.toHaveBeenCalled();
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("telefon mavjud bo'lsa OTP yaratadi va SMS yuboradi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findByPhone.mockResolvedValue(user);
    const service = new AuthService(deps);

    await service.forgotPassword({ phone: user.phone });

    expect(deps.otpRepository.create).toHaveBeenCalledWith(user.phone);
    expect(sendSms).toHaveBeenCalledWith(user.phone, expect.stringContaining("123456"));
  });
});

describe("AuthService.resetPasswordWithOtp", () => {
  const dto = { phone: user.phone, code: "123456", password: "Murcha2026!" };

  it("kod topilmasa UnauthorizedError otadi", async () => {
    const deps = makeDeps();
    deps.otpRepository.get.mockResolvedValue(null);
    const service = new AuthService(deps);

    await expect(service.resetPasswordWithOtp(dto)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("urinishlar limitidan oshsa ForbiddenError otadi va kod o'chiriladi", async () => {
    const deps = makeDeps();
    deps.otpRepository.get.mockResolvedValue({ code: "123456", attempts: 3 });
    const service = new AuthService(deps);

    await expect(service.resetPasswordWithOtp(dto)).rejects.toBeInstanceOf(ForbiddenError);
    expect(deps.otpRepository.delete).toHaveBeenCalledWith(dto.phone);
  });

  it("kod noto'g'ri bo'lsa UnauthorizedError otadi, urinish sanaladi", async () => {
    const deps = makeDeps();
    deps.otpRepository.get.mockResolvedValue({ code: "654321", attempts: 0 });
    const service = new AuthService(deps);

    await expect(service.resetPasswordWithOtp(dto)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(deps.otpRepository.incrementAttempts).toHaveBeenCalledWith(dto.phone);
  });

  it("to'g'ri kodda parolni yangilaydi va barcha sessiyalarni bekor qiladi", async () => {
    const deps = makeDeps();
    deps.usersRepository.findByPhone.mockResolvedValue(user);
    deps.sessionsRepository.listByUser.mockResolvedValue([{ id: "s1" }]);
    const service = new AuthService(deps);

    await service.resetPasswordWithOtp(dto);

    expect(deps.otpRepository.delete).toHaveBeenCalledWith(dto.phone);
    expect(deps.usersRepository.update).toHaveBeenCalledWith(
      fakeTx,
      user.id,
      expect.objectContaining({ passwordHash: "hashed-password" }),
    );
    expect(deps.sessionsRepository.revoke).toHaveBeenCalledWith("s1", user.id);
  });
});
