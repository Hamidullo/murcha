import { describe, it, expect, vi } from "vitest";
import { PurchaseOrdersRepository } from "./purchase-orders.repository.js";

describe("PurchaseOrdersRepository", () => {
  it("create — tx.purchaseOrder.create'ni data bilan chaqiradi", async () => {
    const data = { id: "po1", companyId: "c1" };
    const tx = { purchaseOrder: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new PurchaseOrdersRepository();

    const result = await repo.create(tx, data);

    expect(tx.purchaseOrder.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — items bilan birga qaytaradi", async () => {
    const data = { id: "po1", items: [] };
    const tx = { purchaseOrder: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new PurchaseOrdersRepository();

    const result = await repo.findById(tx, "po1");

    expect(tx.purchaseOrder.findUnique).toHaveBeenCalledWith({
      where: { id: "po1" },
      include: { items: true },
    });
    expect(result).toBe(data);
  });

  it("list — filtrlar berilsa where'ga qo'shadi", async () => {
    const tx = { purchaseOrder: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new PurchaseOrdersRepository();

    await repo.list(tx, "c1", { status: "draft", warehouseId: "w1", supplierId: "s1" });

    expect(tx.purchaseOrder.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1", status: "draft", warehouseId: "w1", supplierId: "s1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("incrementReceived — tx.purchaseOrderItem.update'ni increment bilan chaqiradi", async () => {
    const tx = { purchaseOrderItem: { update: vi.fn().mockResolvedValue({}) } };
    const repo = new PurchaseOrdersRepository();

    await repo.incrementReceived(tx, "i1", 5);

    expect(tx.purchaseOrderItem.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { qtyReceived: { increment: 5 } },
    });
  });

  it("nextCounter — tx.docCounter.upsert'ni purchase_order docType bilan chaqiradi", async () => {
    const tx = { docCounter: { upsert: vi.fn().mockResolvedValue({ counter: 2 }) } };
    const repo = new PurchaseOrdersRepository();

    const result = await repo.nextCounter(tx, "c1", 2026);

    expect(tx.docCounter.upsert).toHaveBeenCalledWith({
      where: {
        companyId_docType_year: { companyId: "c1", docType: "purchase_order", year: 2026 },
      },
      update: { counter: { increment: 1 } },
      create: { companyId: "c1", docType: "purchase_order", year: 2026, counter: 1 },
    });
    expect(result).toBe(2);
  });
});
