import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { ReportsService } = await import("./reports.service.js");

describe("ReportsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let ordersRepository;
  let stockMovementsRepository;
  let stockRepository;
  let productsRepository;
  let transactionsRepository;
  let debtMovementsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    ordersRepository = {
      listAcceptedForReports: vi.fn().mockResolvedValue([]),
      countPending: vi.fn().mockResolvedValue(0),
    };
    stockMovementsRepository = {
      listPositiveWithCost: vi.fn().mockResolvedValue([]),
      listByPeriod: vi.fn().mockResolvedValue([]),
    };
    stockRepository = { list: vi.fn().mockResolvedValue([]) };
    productsRepository = { findById: vi.fn().mockResolvedValue({ nameUz: "Mahsulot" }) };
    transactionsRepository = { list: vi.fn().mockResolvedValue([]) };
    debtMovementsRepository = { listOrderLinkedMovements: vi.fn().mockResolvedValue([]) };
    service = new ReportsService({
      ordersRepository,
      stockMovementsRepository,
      stockRepository,
      productsRepository,
      transactionsRepository,
      debtMovementsRepository,
    });
  });

  describe("getSalesDynamics", () => {
    it("bir xil kundagi zakazlarni yig'indiga qo'shadi", async () => {
      ordersRepository.listAcceptedForReports.mockResolvedValue([
        {
          confirmedAt: new Date("2026-07-01T08:00:00Z"),
          items: [{ price: 1000, qtyAccepted: 2 }],
        },
        {
          confirmedAt: new Date("2026-07-01T15:00:00Z"),
          items: [{ price: 500, qtyAccepted: 3 }],
        },
        {
          confirmedAt: new Date("2026-07-02T08:00:00Z"),
          items: [{ price: 2000, qtyAccepted: 1 }],
        },
      ]);

      const result = await service.getSalesDynamics(auth, {});

      expect(result).toEqual([
        { date: "2026-07-01", total: 3500, count: 2 },
        { date: "2026-07-02", total: 2000, count: 1 },
      ]);
    });

    it("hech qanday zakaz bo'lmasa bo'sh massiv qaytaradi", async () => {
      ordersRepository.listAcceptedForReports.mockResolvedValue([]);

      const result = await service.getSalesDynamics(auth, {});

      expect(result).toEqual([]);
    });
  });

  describe("getProductsReport", () => {
    it("mahsulot bo'yicha yig'indi + marja hisoblaydi, daromad bo'yicha saralaydi", async () => {
      ordersRepository.listAcceptedForReports.mockResolvedValue([
        {
          confirmedAt: new Date("2026-07-01"),
          items: [
            {
              productId: "p1",
              product: { nameUz: "Non", sku: "SKU-1" },
              price: 1000,
              qtyAccepted: 5,
            },
            {
              productId: "p2",
              product: { nameUz: "Choy", sku: "SKU-2" },
              price: 20000,
              qtyAccepted: 1,
            },
          ],
        },
      ]);
      stockMovementsRepository.listPositiveWithCost.mockImplementation((_tx, filters) => {
        if (filters.productId === "p1") return Promise.resolve([{ qty: 10, costPrice: 600 }]);
        return Promise.resolve([]);
      });

      const result = await service.getProductsReport(auth, {});

      expect(result[0]).toMatchObject({
        productId: "p2",
        revenue: 20000,
        cost: null,
        margin: null,
      });
      expect(result[1]).toMatchObject({
        productId: "p1",
        revenue: 5000,
        cost: 3000,
        margin: 2000,
        marginPct: 40,
      });
    });

    it("qtyAccepted 0 bo'lgan qatorlarni o'tkazib yuboradi", async () => {
      ordersRepository.listAcceptedForReports.mockResolvedValue([
        {
          confirmedAt: new Date("2026-07-01"),
          items: [
            {
              productId: "p1",
              product: { nameUz: "Non", sku: "SKU-1" },
              price: 1000,
              qtyAccepted: 0,
            },
          ],
        },
      ]);

      const result = await service.getProductsReport(auth, {});

      expect(result).toEqual([]);
    });

    it("limit berilsa qisqartiradi", async () => {
      ordersRepository.listAcceptedForReports.mockResolvedValue([
        {
          confirmedAt: new Date("2026-07-01"),
          items: [
            { productId: "p1", product: { nameUz: "A", sku: "S1" }, price: 100, qtyAccepted: 1 },
            { productId: "p2", product: { nameUz: "B", sku: "S2" }, price: 200, qtyAccepted: 1 },
          ],
        },
      ]);

      const result = await service.getProductsReport(auth, { limit: 1 });

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe("p2");
    });
  });

  describe("getStockTurnover", () => {
    it("faqat chiqim (qty<0) harakatlarni hisobga oladi, aylanma koeffitsientini hisoblaydi", async () => {
      stockMovementsRepository.listByPeriod.mockResolvedValue([
        { productId: "p1", qty: -10, costPrice: 100 },
        { productId: "p1", qty: 20, costPrice: 90 },
      ]);
      stockRepository.list.mockResolvedValue([{ quantity: 5 }]);
      stockMovementsRepository.listPositiveWithCost.mockResolvedValue([{ qty: 20, costPrice: 80 }]);
      productsRepository.findById.mockResolvedValue({ nameUz: "Non" });

      const result = await service.getStockTurnover(auth, {});

      expect(result).toEqual([
        {
          productId: "p1",
          name: "Non",
          outboundQty: 10,
          outboundValue: 1000,
          avgStockValue: 400,
          turnoverRatio: 2.5,
        },
      ]);
    });

    it("harakat bo'lmasa bo'sh massiv qaytaradi", async () => {
      stockMovementsRepository.listByPeriod.mockResolvedValue([]);

      const result = await service.getStockTurnover(auth, {});

      expect(result).toEqual([]);
    });
  });

  describe("getDashboard", () => {
    it("bugungi sotuv/kutilayotgan zakazlar/kassa/qarz/tugayotgan mahsulotlarni birlashtiradi", async () => {
      ordersRepository.listAcceptedForReports.mockResolvedValue([
        { items: [{ price: 1000, qtyAccepted: 2 }] },
      ]);
      ordersRepository.countPending.mockResolvedValue(3);
      transactionsRepository.list.mockResolvedValue([
        { type: "income", amount: 5000, currency: "UZS" },
        { type: "expense", amount: 1000, currency: "UZS" },
      ]);
      debtMovementsRepository.listOrderLinkedMovements.mockResolvedValue([
        {
          orderId: "o1",
          counterpartyId: "cp1",
          amount: 2000,
          currency: "UZS",
          dueDate: new Date("2020-01-01"),
          order: { number: "1" },
          counterparty: { name: "Do'kon" },
        },
      ]);
      stockRepository.list.mockResolvedValue([
        { quantity: 1, minQty: 5 },
        { quantity: 10, minQty: 5 },
      ]);

      const result = await service.getDashboard(auth);

      expect(result.todaySales).toBe(2000);
      expect(result.pendingOrders).toBe(3);
      expect(result.cashBalanceByCurrency).toEqual({ UZS: 4000 });
      expect(result.debtTotal).toBe(2000);
      expect(result.debtOverdue).toBe(2000);
      expect(result.lowStockCount).toBe(1);
    });
  });
});
