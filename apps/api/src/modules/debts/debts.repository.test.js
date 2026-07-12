import { describe, it, expect, vi } from "vitest";
import { DebtMovementsRepository } from "./debts.repository.js";

describe("DebtMovementsRepository", () => {
  it("create — tx.debtMovement.create'ni data bilan chaqiradi", async () => {
    const data = { id: "m1", companyId: "c1", counterpartyId: "cp1", type: "order", amount: 1000 };
    const tx = { debtMovement: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new DebtMovementsRepository();

    const result = await repo.create(tx, data);

    expect(tx.debtMovement.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("getBalance — companyId+counterpartyId+currency bo'yicha aggregate qiladi", async () => {
    const tx = {
      debtMovement: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 1500 } }) },
    };
    const repo = new DebtMovementsRepository();

    const result = await repo.getBalance(tx, "c1", "cp1", "UZS");

    expect(tx.debtMovement.aggregate).toHaveBeenCalledWith({
      where: { companyId: "c1", counterpartyId: "cp1", currency: "UZS" },
      _sum: { amount: true },
    });
    expect(result).toBe(1500);
  });

  it("getBalance — hech qanday yozuv yo'q bo'lsa 0 qaytaradi", async () => {
    const tx = {
      debtMovement: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null } }) },
    };
    const repo = new DebtMovementsRepository();

    const result = await repo.getBalance(tx, "c1", "cp1", "UZS");

    expect(result).toBe(0);
  });

  it("sumBefore — createdAt < before filtri bilan aggregate qiladi", async () => {
    const before = new Date("2026-01-01");
    const tx = {
      debtMovement: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 300 } }) },
    };
    const repo = new DebtMovementsRepository();

    const result = await repo.sumBefore(tx, "c1", "cp1", "UZS", before);

    expect(tx.debtMovement.aggregate).toHaveBeenCalledWith({
      where: { companyId: "c1", counterpartyId: "cp1", currency: "UZS", createdAt: { lt: before } },
      _sum: { amount: true },
    });
    expect(result).toBe(300);
  });

  it("listByCounterparty — filtrlarsiz asosiy where bilan findMany qiladi", async () => {
    const tx = { debtMovement: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new DebtMovementsRepository();

    await repo.listByCounterparty(tx, "c1", "cp1");

    expect(tx.debtMovement.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1", counterpartyId: "cp1" },
      orderBy: { createdAt: "asc" },
      include: { order: { select: { number: true } } },
    });
  });

  it("listByCounterparty — currency/from/to filtrlari bilan", async () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-02-01");
    const tx = { debtMovement: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new DebtMovementsRepository();

    await repo.listByCounterparty(tx, "c1", "cp1", { currency: "UZS", from, to });

    expect(tx.debtMovement.findMany).toHaveBeenCalledWith({
      where: {
        companyId: "c1",
        counterpartyId: "cp1",
        currency: "UZS",
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: "asc" },
      include: { order: { select: { number: true } } },
    });
  });

  it("listOrderLinkedMovements — orderId not null filtri bilan findMany qiladi", async () => {
    const tx = { debtMovement: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new DebtMovementsRepository();

    await repo.listOrderLinkedMovements(tx, "c1");

    expect(tx.debtMovement.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1", orderId: { not: null } },
      include: { order: { select: { number: true } }, counterparty: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
  });

  it("listOrderLinkedMovements — counterpartyId filtri bilan", async () => {
    const tx = { debtMovement: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new DebtMovementsRepository();

    await repo.listOrderLinkedMovements(tx, "c1", { counterpartyId: "cp1" });

    expect(tx.debtMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "c1", orderId: { not: null }, counterpartyId: "cp1" },
      }),
    );
  });
});
