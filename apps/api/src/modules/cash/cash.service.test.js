import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { CashService } = await import("./cash.service.js");
const { NotFoundError, ValidationError, ConflictError } = await import("../../lib/errors.js");

describe("CashService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let cashRegistersRepository;
  let expenseCategoriesRepository;
  let transactionsRepository;
  let cashShiftsRepository;
  let auditLogsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    cashRegistersRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    };
    expenseCategoriesRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    };
    transactionsRepository = { create: vi.fn(), list: vi.fn() };
    cashShiftsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findOpenByRegister: vi.fn(),
      listByRegister: vi.fn(),
      update: vi.fn(),
    };
    auditLogsRepository = { create: vi.fn() };
    service = new CashService({
      cashRegistersRepository,
      expenseCategoriesRepository,
      transactionsRepository,
      cashShiftsRepository,
      auditLogsRepository,
    });
  });

  describe("createRegister", () => {
    it("yangi id va companyId bilan repository.create'ni chaqiradi", async () => {
      cashRegistersRepository.create.mockResolvedValue({ id: "r1" });

      await service.createRegister(auth, { name: "Bosh kassa", type: "cash", currency: "UZS" });

      expect(cashRegistersRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ companyId: "c1", name: "Bosh kassa" }),
      );
    });
  });

  describe("updateRegister", () => {
    it("mavjud bo'lmasa NotFoundError otadi", async () => {
      cashRegistersRepository.findById.mockResolvedValue(null);

      await expect(service.updateRegister(auth, "r1", { name: "X" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(cashRegistersRepository.update).not.toHaveBeenCalled();
    });

    it("mavjud bo'lsa repository.update'ni chaqiradi", async () => {
      cashRegistersRepository.findById.mockResolvedValue({ id: "r1" });
      cashRegistersRepository.update.mockResolvedValue({ id: "r1", name: "Yangi" });

      const result = await service.updateRegister(auth, "r1", { name: "Yangi" });

      expect(cashRegistersRepository.update).toHaveBeenCalledWith(fakeTx, "r1", { name: "Yangi" });
      expect(result).toEqual({ id: "r1", name: "Yangi" });
    });
  });

  describe("createTransaction", () => {
    it("kassa topilmasa NotFoundError otadi", async () => {
      cashRegistersRepository.findById.mockResolvedValue(null);

      await expect(
        service.createTransaction(auth, {
          cashRegisterId: "r1",
          type: "income",
          amount: 1000,
          currency: "UZS",
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("categoryId berilib topilmasa NotFoundError otadi", async () => {
      cashRegistersRepository.findById.mockResolvedValue({ id: "r1" });
      expenseCategoriesRepository.findById.mockResolvedValue(null);

      await expect(
        service.createTransaction(auth, {
          cashRegisterId: "r1",
          categoryId: "e1",
          type: "expense",
          amount: 1000,
          currency: "UZS",
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("to'g'ri dto bilan transactionsRepository.create'ni chaqiradi", async () => {
      cashRegistersRepository.findById.mockResolvedValue({ id: "r1" });
      transactionsRepository.create.mockResolvedValue({ id: "t1" });

      await service.createTransaction(auth, {
        cashRegisterId: "r1",
        type: "income",
        amount: 1000,
        currency: "UZS",
      });

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyId: "c1",
          cashRegisterId: "r1",
          type: "income",
          amount: 1000,
          currency: "UZS",
          createdBy: "u1",
        }),
      );
    });
  });

  describe("transfer", () => {
    it("manba va qabul qiluvchi bir xil bo'lsa ValidationError otadi", async () => {
      await expect(
        service.transfer(auth, {
          fromCashRegisterId: "r1",
          toCashRegisterId: "r1",
          amount: 1000,
          currency: "UZS",
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("kassalardan biri topilmasa NotFoundError otadi", async () => {
      cashRegistersRepository.findById
        .mockResolvedValueOnce({ id: "r1" })
        .mockResolvedValueOnce(null);

      await expect(
        service.transfer(auth, {
          fromCashRegisterId: "r1",
          toCashRegisterId: "r2",
          amount: 1000,
          currency: "UZS",
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("ikkala kassa topilsa transfer_out va transfer_in yozadi", async () => {
      cashRegistersRepository.findById.mockResolvedValueOnce({ id: "r1" }).mockResolvedValueOnce({
        id: "r2",
      });
      transactionsRepository.create
        .mockResolvedValueOnce({ id: "t1", type: "transfer_out" })
        .mockResolvedValueOnce({ id: "t2", type: "transfer_in" });

      const result = await service.transfer(auth, {
        fromCashRegisterId: "r1",
        toCashRegisterId: "r2",
        amount: 500,
        currency: "UZS",
      });

      expect(transactionsRepository.create).toHaveBeenCalledTimes(2);
      expect(transactionsRepository.create).toHaveBeenNthCalledWith(
        1,
        fakeTx,
        expect.objectContaining({ cashRegisterId: "r1", type: "transfer_out", amount: 500 }),
      );
      expect(transactionsRepository.create).toHaveBeenNthCalledWith(
        2,
        fakeTx,
        expect.objectContaining({ cashRegisterId: "r2", type: "transfer_in", amount: 500 }),
      );
      expect(result).toEqual({
        out: { id: "t1", type: "transfer_out" },
        in: { id: "t2", type: "transfer_in" },
      });
    });
  });

  describe("listTransactions", () => {
    it("repository.list'ni companyId+filtrlar bilan chaqiradi", async () => {
      transactionsRepository.list.mockResolvedValue([]);

      await service.listTransactions(auth, { cashRegisterId: "r1" });

      expect(transactionsRepository.list).toHaveBeenCalledWith(fakeTx, "c1", {
        cashRegisterId: "r1",
      });
    });
  });

  describe("openShift", () => {
    it("kassa topilmasa NotFoundError otadi", async () => {
      cashRegistersRepository.findById.mockResolvedValue(null);

      await expect(service.openShift(auth, "r1", { openingBalance: 0 })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("allaqachon ochiq smena bo'lsa ConflictError otadi", async () => {
      cashRegistersRepository.findById.mockResolvedValue({ id: "r1", companyId: "c1" });
      cashShiftsRepository.findOpenByRegister.mockResolvedValue({ id: "s0" });

      await expect(service.openShift(auth, "r1", { openingBalance: 0 })).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(cashShiftsRepository.create).not.toHaveBeenCalled();
    });

    it("ochiq smena yo'q bo'lsa yangi smena yaratadi", async () => {
      cashRegistersRepository.findById.mockResolvedValue({ id: "r1", companyId: "c1" });
      cashShiftsRepository.findOpenByRegister.mockResolvedValue(null);
      cashShiftsRepository.create.mockResolvedValue({ id: "s1" });

      await service.openShift(auth, "r1", { openingBalance: 50000 });

      expect(cashShiftsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ cashRegisterId: "r1", openingBalance: 50000, openedBy: "u1" }),
      );
    });
  });

  describe("closeShift", () => {
    it("smena topilmasa NotFoundError otadi", async () => {
      cashShiftsRepository.findById.mockResolvedValue(null);

      await expect(service.closeShift(auth, "s1", { countedBalance: 1000 })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("boshqa kompaniya registeriga tegishli bo'lsa NotFoundError otadi", async () => {
      cashShiftsRepository.findById.mockResolvedValue({ id: "s1", cashRegisterId: "r1" });
      cashRegistersRepository.findById.mockResolvedValue({ id: "r1", companyId: "boshqa" });

      await expect(service.closeShift(auth, "s1", { countedBalance: 1000 })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("allaqachon yopilgan bo'lsa ConflictError otadi", async () => {
      cashShiftsRepository.findById.mockResolvedValue({
        id: "s1",
        cashRegisterId: "r1",
        closedAt: new Date(),
      });
      cashRegistersRepository.findById.mockResolvedValue({ id: "r1", companyId: "c1" });

      await expect(service.closeShift(auth, "s1", { countedBalance: 1000 })).rejects.toBeInstanceOf(
        ConflictError,
      );
    });

    it("expectedBalance'ni income/expense/transfer bo'yicha to'g'ri hisoblaydi va diff yozadi", async () => {
      const openedAt = new Date("2026-01-01T08:00:00Z");
      cashShiftsRepository.findById.mockResolvedValue({
        id: "s1",
        cashRegisterId: "r1",
        openedAt,
        openingBalance: 100000,
        closedAt: null,
      });
      cashRegistersRepository.findById.mockResolvedValue({ id: "r1", companyId: "c1" });
      transactionsRepository.list.mockResolvedValue([
        { type: "income", amount: 50000 },
        { type: "expense", amount: 20000 },
        { type: "transfer_in", amount: 10000 },
        { type: "transfer_out", amount: 5000 },
      ]);
      cashShiftsRepository.update.mockResolvedValue({ id: "s1" });

      await service.closeShift(auth, "s1", { countedBalance: 130000, comment: "OK" });

      // expected = 100000 + 50000 - 20000 + 10000 - 5000 = 135000; diff = 130000 - 135000 = -5000
      expect(cashShiftsRepository.update).toHaveBeenCalledWith(
        fakeTx,
        "s1",
        expect.objectContaining({
          expectedBalance: 135000,
          countedBalance: 130000,
          diff: -5000,
          closedBy: "u1",
          comment: "OK",
        }),
      );
      expect(transactionsRepository.list).toHaveBeenCalledWith(fakeTx, "c1", {
        cashRegisterId: "r1",
        from: openedAt,
      });
    });
  });

  describe("listShifts", () => {
    it("kassa topilmasa NotFoundError otadi", async () => {
      cashRegistersRepository.findById.mockResolvedValue(null);

      await expect(service.listShifts(auth, "r1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("kassa mavjud bo'lsa repository.listByRegister'ni chaqiradi", async () => {
      cashRegistersRepository.findById.mockResolvedValue({ id: "r1", companyId: "c1" });
      cashShiftsRepository.listByRegister.mockResolvedValue([{ id: "s1" }]);

      const result = await service.listShifts(auth, "r1");

      expect(cashShiftsRepository.listByRegister).toHaveBeenCalledWith(fakeTx, "r1");
      expect(result).toEqual([{ id: "s1" }]);
    });
  });
});
