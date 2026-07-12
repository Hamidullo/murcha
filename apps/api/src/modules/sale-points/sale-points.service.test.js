import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { SalePointsService } = await import("./sale-points.service.js");
const { NotFoundError, ConflictError } = await import("../../lib/errors.js");

describe("SalePointsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let salePointsRepository;
  let counterpartiesRepository;
  let priceTypesRepository;
  let userAssignmentsRepository;
  let usersRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    salePointsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    };
    counterpartiesRepository = { create: vi.fn(), update: vi.fn() };
    priceTypesRepository = { findById: vi.fn() };
    userAssignmentsRepository = {
      findCompanyMember: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      listByTarget: vi.fn(),
    };
    usersRepository = { findByPhone: vi.fn() };
    service = new SalePointsService({
      salePointsRepository,
      counterpartiesRepository,
      priceTypesRepository,
      userAssignmentsRepository,
      usersRepository,
    });
  });

  describe("create", () => {
    it("narx turi topilmasa NotFoundError otadi", async () => {
      priceTypesRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(auth, { name: "Do'kon 1", priceTypeId: "pt1" }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(counterpartiesRepository.create).not.toHaveBeenCalled();
    });

    it("avval counterparty (type:customer) yaratadi, keyin sale point'ni shunga bog'laydi", async () => {
      priceTypesRepository.findById.mockResolvedValue({ id: "pt1" });
      counterpartiesRepository.create.mockResolvedValue({ id: "cp1" });
      salePointsRepository.create.mockResolvedValue({ id: "sp1", counterpartyId: "cp1" });

      const result = await service.create(auth, {
        name: "Do'kon 1",
        priceTypeId: "pt1",
        phone: "+998901234567",
        creditLimit: 5000000,
      });

      expect(counterpartiesRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyId: "c1",
          type: "customer",
          name: "Do'kon 1",
          phone: "+998901234567",
          creditLimit: 5000000,
          paymentTermDays: 0,
        }),
      );
      expect(salePointsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyId: "c1",
          counterpartyId: "cp1",
          priceTypeId: "pt1",
          name: "Do'kon 1",
        }),
      );
      expect(result).toEqual({ id: "sp1", counterpartyId: "cp1" });
    });
  });

  it("list — repository.list'ni companyId bilan chaqiradi", async () => {
    salePointsRepository.list.mockResolvedValue([{ id: "sp1" }]);

    const result = await service.list(auth);

    expect(salePointsRepository.list).toHaveBeenCalledWith(fakeTx, "c1");
    expect(result).toEqual([{ id: "sp1" }]);
  });

  it("getById — topilmasa NotFoundError otadi", async () => {
    salePointsRepository.findById.mockResolvedValue(null);

    await expect(service.getById(auth, "sp1")).rejects.toBeInstanceOf(NotFoundError);
  });

  describe("update", () => {
    it("topilmasa NotFoundError otadi", async () => {
      salePointsRepository.findById.mockResolvedValue(null);

      await expect(service.update(auth, "sp1", { name: "X" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("creditLimit/phone berilsa bog'liq counterparty'ni ham yangilaydi", async () => {
      salePointsRepository.findById.mockResolvedValue({ id: "sp1", counterpartyId: "cp1" });
      salePointsRepository.update.mockResolvedValue({ id: "sp1" });

      await service.update(auth, "sp1", { creditLimit: 1000000, address: "Yangi manzil" });

      expect(counterpartiesRepository.update).toHaveBeenCalledWith(fakeTx, "cp1", {
        creditLimit: 1000000,
      });
      expect(salePointsRepository.update).toHaveBeenCalledWith(fakeTx, "sp1", {
        address: "Yangi manzil",
      });
    });

    it("faqat sale-point maydoni berilsa counterparty.update chaqirilmaydi", async () => {
      salePointsRepository.findById.mockResolvedValue({ id: "sp1", counterpartyId: "cp1" });
      salePointsRepository.update.mockResolvedValue({ id: "sp1" });

      await service.update(auth, "sp1", { address: "Yangi manzil" });

      expect(counterpartiesRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("assignOperator", () => {
    it("sotuv nuqtasi topilmasa NotFoundError otadi", async () => {
      salePointsRepository.findById.mockResolvedValue(null);

      await expect(service.assignOperator(auth, "sp1", "+998901112233")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(usersRepository.findByPhone).not.toHaveBeenCalled();
    });

    it("bu raqamda foydalanuvchi topilmasa NotFoundError otadi", async () => {
      salePointsRepository.findById.mockResolvedValue({ id: "sp1" });
      usersRepository.findByPhone.mockResolvedValue(null);

      await expect(service.assignOperator(auth, "sp1", "+998901112233")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(userAssignmentsRepository.findCompanyMember).not.toHaveBeenCalled();
    });

    it("foydalanuvchi kompaniya a'zosi bo'lmasa NotFoundError otadi", async () => {
      salePointsRepository.findById.mockResolvedValue({ id: "sp1" });
      usersRepository.findByPhone.mockResolvedValue({ id: "u2" });
      userAssignmentsRepository.findCompanyMember.mockResolvedValue(null);

      await expect(service.assignOperator(auth, "sp1", "+998901112233")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("allaqachon biriktirilgan bo'lsa ConflictError otadi", async () => {
      salePointsRepository.findById.mockResolvedValue({ id: "sp1" });
      usersRepository.findByPhone.mockResolvedValue({ id: "u2" });
      userAssignmentsRepository.findCompanyMember.mockResolvedValue({ id: "cm1" });
      userAssignmentsRepository.findOne.mockResolvedValue({ id: "a1" });

      await expect(service.assignOperator(auth, "sp1", "+998901112233")).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(userAssignmentsRepository.create).not.toHaveBeenCalled();
    });

    it("yangi biriktiruv yaratadi", async () => {
      salePointsRepository.findById.mockResolvedValue({ id: "sp1" });
      usersRepository.findByPhone.mockResolvedValue({ id: "u2" });
      userAssignmentsRepository.findCompanyMember.mockResolvedValue({ id: "cm1" });
      userAssignmentsRepository.findOne.mockResolvedValue(null);
      userAssignmentsRepository.create.mockResolvedValue({ id: "a1" });

      const result = await service.assignOperator(auth, "sp1", "+998901112233");

      expect(userAssignmentsRepository.findCompanyMember).toHaveBeenCalledWith(fakeTx, "c1", "u2");
      expect(userAssignmentsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyMemberId: "cm1",
          targetType: "sale_point",
          targetId: "sp1",
        }),
      );
      expect(result).toEqual({ id: "a1" });
    });
  });

  describe("unassignOperator", () => {
    it("biriktiruv topilmasa NotFoundError otadi", async () => {
      userAssignmentsRepository.findCompanyMember.mockResolvedValue({ id: "cm1" });
      userAssignmentsRepository.findOne.mockResolvedValue(null);

      await expect(service.unassignOperator(auth, "sp1", "u2")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("mavjud bo'lsa o'chiradi", async () => {
      userAssignmentsRepository.findCompanyMember.mockResolvedValue({ id: "cm1" });
      userAssignmentsRepository.findOne.mockResolvedValue({ id: "a1" });

      await service.unassignOperator(auth, "sp1", "u2");

      expect(userAssignmentsRepository.remove).toHaveBeenCalledWith(fakeTx, "a1");
    });
  });
});
