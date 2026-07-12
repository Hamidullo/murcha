import { describe, it, expect, vi } from "vitest";
import { ProductUnitsRepository } from "./product-units.repository.js";

describe("ProductUnitsRepository", () => {
  it("create — tx.productUnit.create'ni data bilan chaqiradi", async () => {
    const data = { id: "pu1", productId: "p1", unitId: "unit-blok", factor: 20 };
    const tx = { productUnit: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductUnitsRepository();

    const result = await repo.create(tx, data);

    expect(tx.productUnit.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.productUnit.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "pu1" };
    const tx = { productUnit: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductUnitsRepository();

    const result = await repo.findById(tx, "pu1");

    expect(tx.productUnit.findUnique).toHaveBeenCalledWith({ where: { id: "pu1" } });
    expect(result).toBe(data);
  });

  it("findByProductAndUnit — composite kalit bilan qidiradi", async () => {
    const data = { id: "pu1" };
    const tx = { productUnit: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductUnitsRepository();

    const result = await repo.findByProductAndUnit(tx, "p1", "unit-blok");

    expect(tx.productUnit.findUnique).toHaveBeenCalledWith({
      where: { productId_unitId: { productId: "p1", unitId: "unit-blok" } },
    });
    expect(result).toBe(data);
  });

  it("list — mahsulot bo'yicha, unit include bilan qaytaradi", async () => {
    const tx = { productUnit: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ProductUnitsRepository();

    await repo.list(tx, "p1");

    expect(tx.productUnit.findMany).toHaveBeenCalledWith({
      where: { productId: "p1" },
      include: { unit: true },
    });
  });

  it("delete — tx.productUnit.delete'ni id bilan chaqiradi", async () => {
    const tx = { productUnit: { delete: vi.fn().mockResolvedValue({}) } };
    const repo = new ProductUnitsRepository();

    await repo.delete(tx, "pu1");

    expect(tx.productUnit.delete).toHaveBeenCalledWith({ where: { id: "pu1" } });
  });
});
