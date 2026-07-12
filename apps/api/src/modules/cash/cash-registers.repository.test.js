import { describe, it, expect, vi } from "vitest";
import { CashRegistersRepository } from "./cash-registers.repository.js";

describe("CashRegistersRepository", () => {
  it("create — tx.cashRegister.create'ni data bilan chaqiradi", async () => {
    const data = { id: "r1", companyId: "c1", name: "Bosh kassa", type: "cash", currency: "UZS" };
    const tx = { cashRegister: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new CashRegistersRepository();

    const result = await repo.create(tx, data);

    expect(tx.cashRegister.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.cashRegister.findUnique'ni id bilan chaqiradi", async () => {
    const tx = { cashRegister: { findUnique: vi.fn().mockResolvedValue({ id: "r1" }) } };
    const repo = new CashRegistersRepository();

    const result = await repo.findById(tx, "r1");

    expect(tx.cashRegister.findUnique).toHaveBeenCalledWith({ where: { id: "r1" } });
    expect(result).toEqual({ id: "r1" });
  });

  it("list — companyId bo'yicha findMany qiladi", async () => {
    const tx = { cashRegister: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new CashRegistersRepository();

    await repo.list(tx, "c1");

    expect(tx.cashRegister.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1" },
      orderBy: { name: "asc" },
    });
  });

  it("update — tx.cashRegister.update'ni id+data bilan chaqiradi", async () => {
    const tx = { cashRegister: { update: vi.fn().mockResolvedValue({ id: "r1" }) } };
    const repo = new CashRegistersRepository();

    await repo.update(tx, "r1", { name: "Yangi" });

    expect(tx.cashRegister.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { name: "Yangi" },
    });
  });
});
