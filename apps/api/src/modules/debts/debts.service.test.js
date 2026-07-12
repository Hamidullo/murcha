import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const renderDebtStatementPdf = vi.fn().mockResolvedValue(Buffer.from("pdf"));
vi.mock("./debts.pdf.js", () => ({ renderDebtStatementPdf }));

const { DebtsService } = await import("./debts.service.js");
const { NotFoundError, ForbiddenError } = await import("../../lib/errors.js");

describe("DebtsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let debtMovementsRepository;
  let salePointsRepository;
  let counterpartiesRepository;
  let userAssignmentsRepository;
  let rolesRepository;
  let companiesRepository;
  let auditLogsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    renderDebtStatementPdf.mockClear();
    debtMovementsRepository = {
      create: vi.fn(),
      getBalance: vi.fn(),
      sumBefore: vi.fn(),
      listByCounterparty: vi.fn(),
      listOrderLinkedMovements: vi.fn(),
    };
    salePointsRepository = { findById: vi.fn() };
    counterpartiesRepository = { findById: vi.fn() };
    userAssignmentsRepository = { findSalePointIdForUser: vi.fn() };
    rolesRepository = { hasPermission: vi.fn() };
    companiesRepository = { findById: vi.fn().mockResolvedValue({ id: "c1", name: "Chaqqon" }) };
    auditLogsRepository = { create: vi.fn() };
    service = new DebtsService({
      debtMovementsRepository,
      salePointsRepository,
      counterpartiesRepository,
      userAssignmentsRepository,
      rolesRepository,
      companiesRepository,
      auditLogsRepository,
    });
  });

  describe("getBalance", () => {
    it("kontragent topilmasa NotFoundError", async () => {
      counterpartiesRepository.findById.mockResolvedValue(null);

      await expect(service.getBalance(auth, "cp1")).rejects.toThrow(NotFoundError);
    });

    it("boshqa kompaniya kontragenti bo'lsa NotFoundError", async () => {
      counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c2" });

      await expect(service.getBalance(auth, "cp1")).rejects.toThrow(NotFoundError);
    });

    it("ruxsat yo'q va boshqa sotuv nuqtasi bo'lsa NotFoundError", async () => {
      counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c1" });
      rolesRepository.hasPermission.mockResolvedValue(false);
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");
      salePointsRepository.findById.mockResolvedValue({ id: "sp1", counterpartyId: "cp2" });

      await expect(service.getBalance(auth, "cp1")).rejects.toThrow(NotFoundError);
    });

    it("debts.view ruxsati bo'lsa balansni qaytaradi", async () => {
      counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c1" });
      rolesRepository.hasPermission.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      debtMovementsRepository.getBalance.mockResolvedValue(5000);

      const result = await service.getBalance(auth, "cp1");

      expect(result).toEqual({ counterpartyId: "cp1", currency: "UZS", balance: 5000 });
    });

    it("o'z sotuv nuqtasi kontragenti bo'lsa balansni qaytaradi", async () => {
      counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c1" });
      rolesRepository.hasPermission.mockResolvedValue(false);
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");
      salePointsRepository.findById.mockResolvedValue({ id: "sp1", counterpartyId: "cp1" });
      debtMovementsRepository.getBalance.mockResolvedValue(2000);

      const result = await service.getBalance(auth, "cp1");

      expect(result.balance).toBe(2000);
    });
  });

  describe("getStatement", () => {
    it("harakatlar bo'yicha joriy balansni to'g'ri hisoblaydi", async () => {
      counterpartiesRepository.findById.mockResolvedValue({
        id: "cp1",
        companyId: "c1",
        name: "Do'kon 1",
      });
      rolesRepository.hasPermission.mockResolvedValueOnce(true);
      debtMovementsRepository.sumBefore.mockResolvedValue(1000);
      debtMovementsRepository.listByCounterparty.mockResolvedValue([
        {
          id: "m1",
          type: "order",
          amount: 500,
          currency: "UZS",
          orderId: "o1",
          order: { number: "1" },
          dueDate: null,
          createdAt: new Date(),
        },
        {
          id: "m2",
          type: "payment",
          amount: -200,
          currency: "UZS",
          orderId: "o1",
          order: { number: "1" },
          dueDate: null,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getStatement(auth, "cp1", { from: "2026-01-01" });

      expect(result.openingBalance).toBe(1000);
      expect(result.movements[0].balance).toBe(1500);
      expect(result.movements[1].balance).toBe(1300);
      expect(result.closingBalance).toBe(1300);
    });
  });

  describe("getStatementPdf", () => {
    it("statement + kompaniya nomini renderDebtStatementPdf'ga uzatadi", async () => {
      counterpartiesRepository.findById.mockResolvedValue({
        id: "cp1",
        companyId: "c1",
        name: "Do'kon 1",
      });
      rolesRepository.hasPermission.mockResolvedValueOnce(true);
      debtMovementsRepository.listByCounterparty.mockResolvedValue([]);

      const result = await service.getStatementPdf(auth, "cp1", {});

      expect(renderDebtStatementPdf).toHaveBeenCalledWith(
        expect.objectContaining({ counterpartyName: "Do'kon 1", companyName: "Chaqqon" }),
      );
      expect(result).toEqual(Buffer.from("pdf"));
    });
  });

  describe("getAging", () => {
    it("ruxsat yo'q bo'lsa ForbiddenError", async () => {
      rolesRepository.hasPermission.mockResolvedValue(false);

      await expect(service.getAging(auth)).rejects.toThrow(ForbiddenError);
    });

    it("orderlarni netto qilib bucket bo'yicha guruhlaydi", async () => {
      rolesRepository.hasPermission.mockResolvedValueOnce(true);
      const dueDatePast = new Date("2026-06-01T00:00:00.000Z"); // 41 kun oldin — 31-60 bucket
      debtMovementsRepository.listOrderLinkedMovements.mockResolvedValue([
        {
          orderId: "o1",
          counterpartyId: "cp1",
          amount: 1000,
          currency: "UZS",
          dueDate: dueDatePast,
          order: { number: "1" },
          counterparty: { name: "Do'kon 1" },
        },
        {
          orderId: "o1",
          counterpartyId: "cp1",
          amount: -300,
          currency: "UZS",
          dueDate: null,
          order: { number: "1" },
          counterparty: { name: "Do'kon 1" },
        },
        {
          orderId: "o2",
          counterpartyId: "cp1",
          amount: 500,
          currency: "UZS",
          dueDate: null,
          order: { number: "2" },
          counterparty: { name: "Do'kon 1" },
        },
      ]);

      const result = await service.getAging(auth, { asOf: "2026-07-12" });

      const cp = result.counterparties.find((c) => c.counterpartyId === "cp1");
      expect(cp.buckets.d31_60).toBe(700);
      expect(cp.buckets.notDue).toBe(500);
      expect(cp.total).toBe(1200);
    });

    it("to'liq to'langan order (balance <= 0) aging'da chiqmaydi", async () => {
      rolesRepository.hasPermission.mockResolvedValueOnce(true);
      debtMovementsRepository.listOrderLinkedMovements.mockResolvedValue([
        {
          orderId: "o1",
          counterpartyId: "cp1",
          amount: 1000,
          currency: "UZS",
          dueDate: new Date("2026-01-01"),
          order: { number: "1" },
          counterparty: { name: "Do'kon 1" },
        },
        {
          orderId: "o1",
          counterpartyId: "cp1",
          amount: -1000,
          currency: "UZS",
          dueDate: null,
          order: { number: "1" },
          counterparty: { name: "Do'kon 1" },
        },
      ]);

      const result = await service.getAging(auth);

      expect(result.counterparties).toHaveLength(0);
    });
  });

  describe("createAdjustment", () => {
    const dto = { counterpartyId: "cp1", type: "opening", amount: 10000, currency: "UZS" };

    it("ruxsat yo'q bo'lsa ForbiddenError", async () => {
      rolesRepository.hasPermission.mockResolvedValue(false);

      await expect(service.createAdjustment(auth, dto)).rejects.toThrow(ForbiddenError);
    });

    it("kontragent topilmasa NotFoundError", async () => {
      rolesRepository.hasPermission.mockResolvedValue(true);
      counterpartiesRepository.findById.mockResolvedValue(null);

      await expect(service.createAdjustment(auth, dto)).rejects.toThrow(NotFoundError);
    });

    it("muvaffaqiyatli — debtMovementsRepository.create'ni to'g'ri data bilan chaqiradi", async () => {
      rolesRepository.hasPermission.mockResolvedValue(true);
      counterpartiesRepository.findById.mockResolvedValue({ id: "cp1", companyId: "c1" });
      debtMovementsRepository.create.mockResolvedValue({ id: "m1", ...dto });

      await service.createAdjustment(auth, dto);

      expect(debtMovementsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyId: "c1",
          counterpartyId: "cp1",
          type: "opening",
          amount: 10000,
          currency: "UZS",
          createdBy: "u1",
        }),
      );
    });
  });

  describe("getMyBalance", () => {
    it("sotuv nuqtasiga biriktirilmagan bo'lsa ForbiddenError", async () => {
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue(null);

      await expect(service.getMyBalance(auth)).rejects.toThrow(ForbiddenError);
    });

    it("o'z kontragentining balansini qaytaradi", async () => {
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");
      salePointsRepository.findById.mockResolvedValue({ id: "sp1", counterpartyId: "cp1" });
      debtMovementsRepository.getBalance.mockResolvedValue(750);

      const result = await service.getMyBalance(auth);

      expect(result).toEqual({ counterpartyId: "cp1", currency: "UZS", balance: 750 });
    });
  });
});
