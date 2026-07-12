import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const hashPassword = vi.fn().mockResolvedValue("hashed");
vi.mock("../../lib/password.js", () => ({ hashPassword: (...args) => hashPassword(...args) }));

const sendSms = vi.fn().mockResolvedValue(undefined);
vi.mock("../../lib/sms.js", () => ({ sendSms: (...args) => sendSms(...args) }));

const { CompanyMembersService } = await import("./company-members.service.js");
const { NotFoundError, ConflictError } = await import("../../lib/errors.js");

describe("CompanyMembersService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let companyMembersRepository;
  let usersRepository;
  let rolesRepository;
  let userAssignmentsRepository;
  let sessionsRepository;
  let passwordResetRepository;
  let auditLogsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    hashPassword.mockClear();
    sendSms.mockClear();
    companyMembersRepository = {
      create: vi.fn(),
      findByCompanyAndUser: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    };
    usersRepository = { findByPhone: vi.fn(), create: vi.fn(), update: vi.fn() };
    rolesRepository = { findById: vi.fn() };
    userAssignmentsRepository = { create: vi.fn() };
    sessionsRepository = { listByUser: vi.fn(), revoke: vi.fn() };
    passwordResetRepository = { createToken: vi.fn().mockResolvedValue("reset-token") };
    auditLogsRepository = { create: vi.fn() };
    service = new CompanyMembersService({
      companyMembersRepository,
      usersRepository,
      rolesRepository,
      userAssignmentsRepository,
      sessionsRepository,
      passwordResetRepository,
      auditLogsRepository,
    });
  });

  const dto = { phone: "+998901112233", fullName: "Aziz Karimov", roleId: "role1" };

  describe("create", () => {
    it("rol topilmasa NotFoundError otadi", async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(service.create(auth, dto)).rejects.toBeInstanceOf(NotFoundError);
      expect(usersRepository.findByPhone).not.toHaveBeenCalled();
    });

    it("boshqa kompaniyaning maxsus roli bo'lsa NotFoundError otadi", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "role1", companyId: "c2" });

      await expect(service.create(auth, dto)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("telefon bo'yicha mavjud foydalanuvchi bo'lsa yangi User yaratmaydi", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "role1", companyId: null });
      usersRepository.findByPhone.mockResolvedValue({ id: "u9", phone: dto.phone });
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue(null);
      companyMembersRepository.create.mockResolvedValue({ id: "cm1" });
      companyMembersRepository.findById.mockResolvedValue({ id: "cm1" });

      await service.create(auth, dto);

      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(companyMembersRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ companyId: "c1", userId: "u9", roleId: "role1" }),
      );
    });

    it("foydalanuvchi bu kompaniyaga allaqachon a'zo bo'lsa ConflictError otadi", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "role1", companyId: null });
      usersRepository.findByPhone.mockResolvedValue({ id: "u9" });
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue({ id: "cm-existing" });

      await expect(service.create(auth, dto)).rejects.toBeInstanceOf(ConflictError);
      expect(companyMembersRepository.create).not.toHaveBeenCalled();
    });

    it("yangi telefon bo'lsa parolsiz (unusable) User yaratadi va taklif SMS yuboradi", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "role1", companyId: null });
      usersRepository.findByPhone.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue({ id: "u-new", phone: dto.phone });
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue(null);
      companyMembersRepository.create.mockResolvedValue({ id: "cm1" });
      companyMembersRepository.findById.mockResolvedValue({
        id: "cm1",
        userId: "u-new",
        user: { id: "u-new", phone: dto.phone },
        role: { id: "role1", name: "Sotuvchi" },
      });

      await service.create(auth, dto);

      expect(usersRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          phone: dto.phone,
          fullName: dto.fullName,
          passwordHash: "hashed",
        }),
      );
      expect(hashPassword).toHaveBeenCalled();
      expect(passwordResetRepository.createToken).toHaveBeenCalledWith("u-new");
      expect(sendSms).toHaveBeenCalledWith(dto.phone, expect.stringContaining("reset-token"));
    });

    it("mavjud foydalanuvchi qo'shilganda SMS yuborilmaydi (u allaqachon parolga ega)", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "role1", companyId: null });
      usersRepository.findByPhone.mockResolvedValue({ id: "u9", phone: dto.phone });
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue(null);
      companyMembersRepository.create.mockResolvedValue({ id: "cm1" });
      companyMembersRepository.findById.mockResolvedValue({ id: "cm1", userId: "u9" });

      await service.create(auth, dto);

      expect(sendSms).not.toHaveBeenCalled();
      expect(passwordResetRepository.createToken).not.toHaveBeenCalled();
    });

    it("assignments berilsa har biri uchun UserAssignment yaratadi", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "role1", companyId: null });
      usersRepository.findByPhone.mockResolvedValue({ id: "u9" });
      companyMembersRepository.findByCompanyAndUser.mockResolvedValue(null);
      companyMembersRepository.create.mockResolvedValue({ id: "cm1" });
      companyMembersRepository.findById.mockResolvedValue({ id: "cm1" });

      await service.create(auth, {
        ...dto,
        assignments: [{ targetType: "warehouse", targetId: "w1" }],
      });

      expect(userAssignmentsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyMemberId: "cm1",
          targetType: "warehouse",
          targetId: "w1",
        }),
      );
    });
  });

  it("list — repository.list'ni companyId bilan chaqiradi", async () => {
    companyMembersRepository.list.mockResolvedValue([{ id: "cm1" }]);

    const result = await service.list(auth);

    expect(companyMembersRepository.list).toHaveBeenCalledWith(fakeTx, "c1");
    expect(result).toEqual([{ id: "cm1" }]);
  });

  describe("getById", () => {
    it("boshqa kompaniya a'zosi bo'lsa NotFoundError otadi", async () => {
      companyMembersRepository.findById.mockResolvedValue({ id: "cm1", companyId: "c2" });

      await expect(service.getById(auth, "cm1")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("update", () => {
    it("hodim topilmasa NotFoundError otadi", async () => {
      companyMembersRepository.findById.mockResolvedValue(null);

      await expect(service.update(auth, "cm1", { status: "blocked" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("bloklanganda foydalanuvchining barcha sessiyalari bekor qilinadi", async () => {
      companyMembersRepository.findById.mockResolvedValue({
        id: "cm1",
        companyId: "c1",
        userId: "u9",
      });
      companyMembersRepository.update.mockResolvedValue({ id: "cm1", status: "blocked" });
      sessionsRepository.listByUser.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);

      await service.update(auth, "cm1", { status: "blocked" });

      expect(sessionsRepository.revoke).toHaveBeenCalledWith("s1", "u9");
      expect(sessionsRepository.revoke).toHaveBeenCalledWith("s2", "u9");
    });

    it("faollashtirishda sessiyalar bekor qilinmaydi", async () => {
      companyMembersRepository.findById.mockResolvedValue({
        id: "cm1",
        companyId: "c1",
        userId: "u9",
      });
      companyMembersRepository.update.mockResolvedValue({ id: "cm1", status: "active" });

      await service.update(auth, "cm1", { status: "active" });

      expect(sessionsRepository.listByUser).not.toHaveBeenCalled();
    });

    it("roleId berilsa yangi rolni tekshiradi", async () => {
      companyMembersRepository.findById.mockResolvedValue({
        id: "cm1",
        companyId: "c1",
        userId: "u9",
      });
      rolesRepository.findById.mockResolvedValue(null);

      await expect(service.update(auth, "cm1", { roleId: "role-x" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("resetPassword", () => {
    it("hodim topilmasa NotFoundError otadi", async () => {
      companyMembersRepository.findById.mockResolvedValue(null);

      await expect(service.resetPassword(auth, "cm1")).rejects.toBeInstanceOf(NotFoundError);
      expect(usersRepository.update).not.toHaveBeenCalled();
    });

    it("parolni 'unusable' qiymatga almashtiradi, sessiyalarni bekor qiladi, SMS yuboradi", async () => {
      companyMembersRepository.findById
        .mockResolvedValueOnce({ id: "cm1", companyId: "c1", userId: "u9" })
        .mockResolvedValueOnce({
          id: "cm1",
          userId: "u9",
          user: { id: "u9", phone: "+998901112233" },
        });
      sessionsRepository.listByUser.mockResolvedValue([{ id: "s1" }]);

      await service.resetPassword(auth, "cm1");

      expect(usersRepository.update).toHaveBeenCalledWith(
        fakeTx,
        "u9",
        expect.objectContaining({ passwordHash: "hashed" }),
      );
      expect(sessionsRepository.revoke).toHaveBeenCalledWith("s1", "u9");
      expect(passwordResetRepository.createToken).toHaveBeenCalledWith("u9");
      expect(sendSms).toHaveBeenCalledWith("+998901112233", expect.stringContaining("reset-token"));
    });
  });
});
