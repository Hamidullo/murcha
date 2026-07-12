import { describe, it, expect, vi } from "vitest";
import { CashShiftsRepository } from "./cash-shifts.repository.js";

describe("CashShiftsRepository", () => {
  it("create — tx.cashShift.create'ni data bilan chaqiradi", async () => {
    const data = { id: "s1", cashRegisterId: "r1", openingBalance: 0 };
    const tx = { cashShift: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new CashShiftsRepository();

    const result = await repo.create(tx, data);

    expect(tx.cashShift.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.cashShift.findUnique'ni id bilan chaqiradi", async () => {
    const tx = { cashShift: { findUnique: vi.fn().mockResolvedValue({ id: "s1" }) } };
    const repo = new CashShiftsRepository();

    const result = await repo.findById(tx, "s1");

    expect(tx.cashShift.findUnique).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(result).toEqual({ id: "s1" });
  });

  it("findOpenByRegister — closedAt:null filtri bilan findFirst qiladi", async () => {
    const tx = { cashShift: { findFirst: vi.fn().mockResolvedValue(null) } };
    const repo = new CashShiftsRepository();

    await repo.findOpenByRegister(tx, "r1");

    expect(tx.cashShift.findFirst).toHaveBeenCalledWith({
      where: { cashRegisterId: "r1", closedAt: null },
    });
  });

  it("listByRegister — cashRegisterId bo'yicha findMany qiladi", async () => {
    const tx = { cashShift: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new CashShiftsRepository();

    await repo.listByRegister(tx, "r1");

    expect(tx.cashShift.findMany).toHaveBeenCalledWith({
      where: { cashRegisterId: "r1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("update — tx.cashShift.update'ni id+data bilan chaqiradi", async () => {
    const tx = { cashShift: { update: vi.fn().mockResolvedValue({ id: "s1" }) } };
    const repo = new CashShiftsRepository();

    await repo.update(tx, "s1", { closedAt: new Date("2026-01-01") });

    expect(tx.cashShift.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { closedAt: new Date("2026-01-01") },
    });
  });
});
