import { describe, it, expect, vi } from "vitest";
import { ExpenseCategoriesRepository } from "./expense-categories.repository.js";

describe("ExpenseCategoriesRepository", () => {
  it("create — tx.expenseCategory.create'ni data bilan chaqiradi", async () => {
    const data = { id: "e1", companyId: "c1", name: "Transport" };
    const tx = { expenseCategory: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new ExpenseCategoriesRepository();

    const result = await repo.create(tx, data);

    expect(tx.expenseCategory.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.expenseCategory.findUnique'ni id bilan chaqiradi", async () => {
    const tx = { expenseCategory: { findUnique: vi.fn().mockResolvedValue({ id: "e1" }) } };
    const repo = new ExpenseCategoriesRepository();

    const result = await repo.findById(tx, "e1");

    expect(tx.expenseCategory.findUnique).toHaveBeenCalledWith({ where: { id: "e1" } });
    expect(result).toEqual({ id: "e1" });
  });

  it("list — companyId bo'yicha findMany qiladi", async () => {
    const tx = { expenseCategory: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ExpenseCategoriesRepository();

    await repo.list(tx, "c1");

    expect(tx.expenseCategory.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1" },
      orderBy: { name: "asc" },
    });
  });

  it("update — tx.expenseCategory.update'ni id+data bilan chaqiradi", async () => {
    const tx = { expenseCategory: { update: vi.fn().mockResolvedValue({ id: "e1" }) } };
    const repo = new ExpenseCategoriesRepository();

    await repo.update(tx, "e1", { name: "Yangi" });

    expect(tx.expenseCategory.update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { name: "Yangi" },
    });
  });
});
