import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { StockService } = await import("./stock.service.js");

describe("StockService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let stockRepository;
  let stockMovementsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    stockRepository = { list: vi.fn() };
    stockMovementsRepository = { listPositiveWithCost: vi.fn() };
    service = new StockService({ stockRepository, stockMovementsRepository });
  });

  it("list — repository.list'ni companyId va filtrlar bilan chaqiradi", async () => {
    stockRepository.list.mockResolvedValue([{ id: "s1" }]);

    const result = await service.list(auth, { warehouseId: "w1" });

    expect(stockRepository.list).toHaveBeenCalledWith(fakeTx, "c1", { warehouseId: "w1" });
    expect(result).toEqual([{ id: "s1" }]);
  });

  it("listLowStock — onlyTracked bilan so'raydi va quantity<=minQty filtrlaydi", async () => {
    stockRepository.list.mockResolvedValue([
      { id: "s1", quantity: 5, minQty: 10 },
      { id: "s2", quantity: 20, minQty: 10 },
      { id: "s3", quantity: 10, minQty: 10 },
    ]);

    const result = await service.listLowStock(auth, { warehouseId: "w1" });

    expect(stockRepository.list).toHaveBeenCalledWith(fakeTx, "c1", {
      warehouseId: "w1",
      onlyTracked: true,
    });
    expect(result).toEqual([
      { id: "s1", quantity: 5, minQty: 10 },
      { id: "s3", quantity: 10, minQty: 10 },
    ]);
  });

  it("averageCost — og'irlashtirilgan o'rtachani hisoblaydi", async () => {
    stockMovementsRepository.listPositiveWithCost.mockResolvedValue([
      { qty: 10, costPrice: 100 },
      { qty: 5, costPrice: 130 },
    ]);

    const result = await service.averageCost(auth, { productId: "p1" });

    // (10*100 + 5*130) / 15 = 1650/15 = 110
    expect(result).toEqual({ productId: "p1", averageCost: 110 });
  });

  it("averageCost — harakat bo'lmasa null qaytaradi", async () => {
    stockMovementsRepository.listPositiveWithCost.mockResolvedValue([]);

    const result = await service.averageCost(auth, { productId: "p1" });

    expect(result).toEqual({ productId: "p1", averageCost: null });
  });
});
