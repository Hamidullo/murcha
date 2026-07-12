import { describe, it, expect, vi } from "vitest";
import { CounterpartiesRepository } from "./counterparties.repository.js";

describe("CounterpartiesRepository", () => {
  it("create — tx.counterparty.create'ni data bilan chaqiradi", async () => {
    const data = { id: "cp1", companyId: "c1", name: "Aziz Trade" };
    const tx = { counterparty: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new CounterpartiesRepository();

    const result = await repo.create(tx, data);

    expect(tx.counterparty.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.counterparty.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "cp1" };
    const tx = { counterparty: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new CounterpartiesRepository();

    const result = await repo.findById(tx, "cp1");

    expect(tx.counterparty.findUnique).toHaveBeenCalledWith({ where: { id: "cp1" } });
    expect(result).toBe(data);
  });

  it("list — filtrlar berilsa where'ga qo'shadi, deletedAt:null doim bor", async () => {
    const tx = { counterparty: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new CounterpartiesRepository();

    await repo.list(tx, "c1", { type: "supplier", search: "aziz" });

    expect(tx.counterparty.findMany).toHaveBeenCalledWith({
      where: {
        companyId: "c1",
        deletedAt: null,
        type: "supplier",
        name: { contains: "aziz", mode: "insensitive" },
      },
      orderBy: { name: "asc" },
    });
  });

  it("update — tx.counterparty.update'ni id va data bilan chaqiradi", async () => {
    const updated = { id: "cp1", name: "Yangi nom" };
    const tx = { counterparty: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new CounterpartiesRepository();

    const result = await repo.update(tx, "cp1", { name: "Yangi nom" });

    expect(tx.counterparty.update).toHaveBeenCalledWith({
      where: { id: "cp1" },
      data: { name: "Yangi nom" },
    });
    expect(result).toBe(updated);
  });
});
