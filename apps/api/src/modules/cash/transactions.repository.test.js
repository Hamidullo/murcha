import { describe, it, expect, vi } from "vitest";
import { TransactionsRepository } from "./transactions.repository.js";

describe("TransactionsRepository", () => {
  it("create — tx.transaction.create'ni data bilan chaqiradi", async () => {
    const data = { id: "t1", companyId: "c1", cashRegisterId: "r1", type: "income", amount: 1000 };
    const tx = { transaction: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new TransactionsRepository();

    const result = await repo.create(tx, data);

    expect(tx.transaction.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("list — filtrlarsiz companyId bo'yicha findMany qiladi", async () => {
    const tx = { transaction: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new TransactionsRepository();

    await repo.list(tx, "c1");

    expect(tx.transaction.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1" },
      include: {
        cashRegister: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { occurredAt: "desc" },
    });
  });

  it("list — cashRegisterId/type/from/to filtrlari bilan", async () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-02-01");
    const tx = { transaction: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new TransactionsRepository();

    await repo.list(tx, "c1", { cashRegisterId: "r1", type: "income", from, to });

    expect(tx.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "c1",
          cashRegisterId: "r1",
          type: "income",
          occurredAt: { gte: from, lte: to },
        },
      }),
    );
  });
});
