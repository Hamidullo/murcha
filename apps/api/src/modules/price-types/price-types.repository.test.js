import { describe, it, expect, vi } from "vitest";
import { PriceTypesRepository } from "./price-types.repository.js";

describe("PriceTypesRepository", () => {
  it("create — tx.priceType.create'ni data bilan chaqiradi", async () => {
    const data = { id: "pt1", companyId: "c1", name: "Chakana" };
    const tx = { priceType: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new PriceTypesRepository();

    const result = await repo.create(tx, data);

    expect(tx.priceType.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.priceType.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "pt1", name: "Chakana" };
    const tx = { priceType: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new PriceTypesRepository();

    const result = await repo.findById(tx, "pt1");

    expect(tx.priceType.findUnique).toHaveBeenCalledWith({ where: { id: "pt1" } });
    expect(result).toBe(data);
  });

  it("list — tx.priceType.findMany'ni companyId bilan chaqiradi", async () => {
    const tx = { priceType: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new PriceTypesRepository();

    await repo.list(tx, "c1");

    expect(tx.priceType.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1" },
      orderBy: { name: "asc" },
    });
  });

  it("update — tx.priceType.update'ni id va data bilan chaqiradi", async () => {
    const data = { name: "Ulgurji" };
    const updated = { id: "pt1", ...data };
    const tx = { priceType: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new PriceTypesRepository();

    const result = await repo.update(tx, "pt1", data);

    expect(tx.priceType.update).toHaveBeenCalledWith({ where: { id: "pt1" }, data });
    expect(result).toBe(updated);
  });

  it("unsetDefault — excludeId berilsa shu ID bundan mustasno", async () => {
    const tx = { priceType: { updateMany: vi.fn().mockResolvedValue({}) } };
    const repo = new PriceTypesRepository();

    await repo.unsetDefault(tx, "c1", "pt1");

    expect(tx.priceType.updateMany).toHaveBeenCalledWith({
      where: { companyId: "c1", isDefault: true, id: { not: "pt1" } },
      data: { isDefault: false },
    });
  });

  it("unsetDefault — excludeId null bo'lsa hammasini o'chiradi", async () => {
    const tx = { priceType: { updateMany: vi.fn().mockResolvedValue({}) } };
    const repo = new PriceTypesRepository();

    await repo.unsetDefault(tx, "c1", null);

    expect(tx.priceType.updateMany).toHaveBeenCalledWith({
      where: { companyId: "c1", isDefault: true },
      data: { isDefault: false },
    });
  });
});
