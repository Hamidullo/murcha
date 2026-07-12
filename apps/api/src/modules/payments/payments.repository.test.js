import { describe, it, expect, vi } from "vitest";
import { PaymentsRepository } from "./payments.repository.js";

describe("PaymentsRepository", () => {
  it("create — tx.payment.create'ni data bilan chaqiradi", async () => {
    const data = { id: "p1", companyId: "c1", counterpartyId: "cp1", amount: 1000 };
    const tx = { payment: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new PaymentsRepository();

    const result = await repo.create(tx, data);

    expect(tx.payment.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("addAllocation — tx.paymentAllocation.create'ni data bilan chaqiradi", async () => {
    const data = { id: "a1", paymentId: "p1", orderId: "o1", amount: 500 };
    const tx = { paymentAllocation: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new PaymentsRepository();

    const result = await repo.addAllocation(tx, data);

    expect(tx.paymentAllocation.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });
});
