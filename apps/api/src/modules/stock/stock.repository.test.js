import { describe, it, expect, vi } from "vitest";
import { StockRepository } from "./stock.repository.js";

describe("StockRepository", () => {
  it("findOne — null variant/batch uchun IS NULL bilan qidiradi", async () => {
    const data = { id: "s1", quantity: 10 };
    const tx = { stock: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new StockRepository();

    const result = await repo.findOne(tx, {
      warehouseId: "w1",
      productId: "p1",
      variantId: null,
      batchId: null,
    });

    expect(tx.stock.findUnique).toHaveBeenCalledWith({
      where: {
        warehouseId_productId_variantId_batchId: {
          warehouseId: "w1",
          productId: "p1",
          variantId: null,
          batchId: null,
        },
      },
    });
    expect(result).toBe(data);
  });

  it("applyDelta — tx.stock.upsert'ni increment bilan chaqiradi", async () => {
    const data = { id: "s1", quantity: 10 };
    const tx = { stock: { upsert: vi.fn().mockResolvedValue(data) } };
    const repo = new StockRepository();

    const result = await repo.applyDelta(tx, {
      id: "s1",
      companyId: "c1",
      warehouseId: "w1",
      productId: "p1",
      variantId: null,
      batchId: null,
      qtyDelta: 5,
    });

    expect(tx.stock.upsert).toHaveBeenCalledWith({
      where: {
        warehouseId_productId_variantId_batchId: {
          warehouseId: "w1",
          productId: "p1",
          variantId: null,
          batchId: null,
        },
      },
      update: { quantity: { increment: 5 } },
      create: {
        id: "s1",
        companyId: "c1",
        warehouseId: "w1",
        productId: "p1",
        variantId: null,
        batchId: null,
        quantity: 5,
      },
    });
    expect(result).toBe(data);
  });

  it("list — filtrlar berilsa where'ga qo'shadi", async () => {
    const tx = { stock: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new StockRepository();

    await repo.list(tx, "c1", { warehouseId: "w1", productId: "p1", onlyTracked: true });

    expect(tx.stock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "c1",
          warehouseId: "w1",
          productId: "p1",
          minQty: { not: null },
        },
      }),
    );
  });

  it("list — filtrsiz faqat companyId bilan qidiradi", async () => {
    const tx = { stock: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new StockRepository();

    await repo.list(tx, "c1");

    expect(tx.stock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: "c1" } }),
    );
  });
});
