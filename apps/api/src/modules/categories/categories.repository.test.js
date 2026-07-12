import { describe, it, expect, vi } from "vitest";
import { CategoriesRepository } from "./categories.repository.js";

describe("CategoriesRepository", () => {
  it("create — tx.category.create'ni data bilan chaqiradi", async () => {
    const data = { id: "cat1", companyId: "c1", nameUz: "Ichimliklar" };
    const tx = { category: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new CategoriesRepository();

    const result = await repo.create(tx, data);

    expect(tx.category.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.category.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "cat1", nameUz: "Ichimliklar" };
    const tx = { category: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new CategoriesRepository();

    const result = await repo.findById(tx, "cat1");

    expect(tx.category.findUnique).toHaveBeenCalledWith({ where: { id: "cat1" } });
    expect(result).toBe(data);
  });

  it("list — tx.category.findMany'ni companyId va tartib bilan chaqiradi", async () => {
    const tx = { category: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new CategoriesRepository();

    await repo.list(tx, "c1");

    expect(tx.category.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1" },
      orderBy: [{ sort: "asc" }, { nameUz: "asc" }],
    });
  });

  it("update — tx.category.update'ni id va data bilan chaqiradi", async () => {
    const data = { nameUz: "Yangi nom" };
    const updated = { id: "cat1", ...data };
    const tx = { category: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new CategoriesRepository();

    const result = await repo.update(tx, "cat1", data);

    expect(tx.category.update).toHaveBeenCalledWith({ where: { id: "cat1" }, data });
    expect(result).toBe(updated);
  });
});
