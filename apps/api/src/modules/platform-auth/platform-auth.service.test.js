import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.JWT_ACCESS_SECRET = "test-secret-kamida-32-belgi-uzunlikda";

const fakeTx = {};
const withoutTenant = vi.fn((callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withoutTenant }));
vi.mock("../../lib/password.js", () => ({
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

const { PlatformAuthService } = await import("./platform-auth.service.js");
const { UnauthorizedError, ForbiddenError } = await import("../../lib/errors.js");
const { verifyPassword } = await import("../../lib/password.js");
const { verifyToken } = await import("../../lib/jwt.js");

const loginDto = { phone: "+998901234567", password: "Murcha2026!" };
const platformAdminUser = {
  id: "u1",
  phone: loginDto.phone,
  fullName: "Platform admin",
  passwordHash: "hash",
  isPlatformAdmin: true,
};

describe("PlatformAuthService.login", () => {
  let usersRepository;
  let loginAttemptsRepository;
  let service;

  beforeEach(() => {
    withoutTenant.mockClear();
    verifyPassword.mockClear().mockResolvedValue(true);
    usersRepository = { findByPhone: vi.fn().mockResolvedValue(null) };
    loginAttemptsRepository = {
      getFailureCount: vi.fn().mockResolvedValue(0),
      recordFailure: vi.fn().mockResolvedValue(1),
      reset: vi.fn().mockResolvedValue(undefined),
    };
    service = new PlatformAuthService({ usersRepository, loginAttemptsRepository });
  });

  it("foydalanuvchi topilmasa UnauthorizedError otadi", async () => {
    await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(loginAttemptsRepository.recordFailure).toHaveBeenCalledWith(
      `platform:${loginDto.phone}`,
    );
  });

  it("foydalanuvchi isPlatformAdmin bo'lmasa UnauthorizedError otadi", async () => {
    usersRepository.findByPhone.mockResolvedValue({ ...platformAdminUser, isPlatformAdmin: false });

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("parol noto'g'ri bo'lsa UnauthorizedError otadi", async () => {
    usersRepository.findByPhone.mockResolvedValue(platformAdminUser);
    verifyPassword.mockResolvedValue(false);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("5 marta xato urinishdan keyin ForbiddenError bilan bloklanadi", async () => {
    loginAttemptsRepository.getFailureCount.mockResolvedValue(5);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(ForbiddenError);
    expect(usersRepository.findByPhone).not.toHaveBeenCalled();
  });

  it("to'g'ri ma'lumot bilan platform_access token qaytaradi", async () => {
    usersRepository.findByPhone.mockResolvedValue(platformAdminUser);

    const result = await service.login(loginDto);

    expect(loginAttemptsRepository.reset).toHaveBeenCalledWith(`platform:${loginDto.phone}`);
    expect(result.user).toEqual({ id: "u1", phone: loginDto.phone, fullName: "Platform admin" });
    const decoded = verifyToken(result.accessToken);
    expect(decoded.type).toBe("platform_access");
    expect(decoded.userId).toBe("u1");
  });
});
