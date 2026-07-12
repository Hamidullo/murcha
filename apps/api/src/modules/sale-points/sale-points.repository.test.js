import { describe, it, expect, vi } from "vitest";
import { SalePointsRepository } from "./sale-points.repository.js";

describe("SalePointsRepository", () => {
  it("create — tx.salePoint.create'ni data bilan chaqiradi", async () => {
    const data = { id: "sp1", companyId: "c1", name: "Do'kon 1" };
    const tx = { salePoint: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new SalePointsRepository();

    const result = await repo.create(tx, data);

    expect(tx.salePoint.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.salePoint.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "sp1" };
    const tx = { salePoint: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new SalePointsRepository();

    const result = await repo.findById(tx, "sp1");

    expect(tx.salePoint.findUnique).toHaveBeenCalledWith({ where: { id: "sp1" } });
    expect(result).toBe(data);
  });

  it("findByCounterpartyId — tx.salePoint.findFirst'ni counterpartyId bilan chaqiradi", async () => {
    const data = { id: "sp1", counterpartyId: "cp1" };
    const tx = { salePoint: { findFirst: vi.fn().mockResolvedValue(data) } };
    const repo = new SalePointsRepository();

    const result = await repo.findByCounterpartyId(tx, "cp1");

    expect(tx.salePoint.findFirst).toHaveBeenCalledWith({ where: { counterpartyId: "cp1" } });
    expect(result).toBe(data);
  });

  it("list — companyId bo'yicha, nom bo'yicha tartiblangan", async () => {
    const tx = { salePoint: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new SalePointsRepository();

    await repo.list(tx, "c1");

    expect(tx.salePoint.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1" },
      orderBy: { name: "asc" },
    });
  });

  it("update — tx.salePoint.update'ni id va data bilan chaqiradi", async () => {
    const updated = { id: "sp1", name: "Yangi nom" };
    const tx = { salePoint: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new SalePointsRepository();

    const result = await repo.update(tx, "sp1", { name: "Yangi nom" });

    expect(tx.salePoint.update).toHaveBeenCalledWith({
      where: { id: "sp1" },
      data: { name: "Yangi nom" },
    });
    expect(result).toBe(updated);
  });
});
