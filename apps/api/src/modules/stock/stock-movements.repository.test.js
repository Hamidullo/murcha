import { describe, it, expect, vi } from "vitest";
import { StockMovementsRepository } from "./stock-movements.repository.js";

describe("StockMovementsRepository", () => {
  it("create — tx.stockMovement.create'ni data bilan chaqiradi", async () => {
    const data = { id: "m1", docId: "d1", qty: 10 };
    const tx = { stockMovement: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new StockMovementsRepository();

    const result = await repo.create(tx, data);

    expect(tx.stockMovement.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("listPositiveWithCost — qty>0 va costPrice mavjud qatorlarni so'raydi", async () => {
    const tx = { stockMovement: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new StockMovementsRepository();

    await repo.listPositiveWithCost(tx, { companyId: "c1", productId: "p1", warehouseId: "w1" });

    expect(tx.stockMovement.findMany).toHaveBeenCalledWith({
      where: {
        companyId: "c1",
        productId: "p1",
        qty: { gt: 0 },
        costPrice: { not: null },
        warehouseId: "w1",
      },
    });
  });

  it("listByPeriod — filtrlarsiz companyId bo'yicha findMany qiladi", async () => {
    const tx = { stockMovement: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new StockMovementsRepository();

    await repo.listByPeriod(tx, "c1");

    expect(tx.stockMovement.findMany).toHaveBeenCalledWith({ where: { companyId: "c1" } });
  });

  it("listByPeriod — from/to filtri bilan", async () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-02-01");
    const tx = { stockMovement: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new StockMovementsRepository();

    await repo.listByPeriod(tx, "c1", { from, to });

    expect(tx.stockMovement.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1", createdAt: { gte: from, lte: to } },
    });
  });
});
