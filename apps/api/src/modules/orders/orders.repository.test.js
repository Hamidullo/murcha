import { describe, it, expect, vi } from "vitest";
import { OrdersRepository } from "./orders.repository.js";

describe("OrdersRepository", () => {
  it("create — tx.order.create'ni data va items include bilan chaqiradi", async () => {
    const data = { id: "o1", companyId: "c1", items: { create: [] } };
    const tx = { order: { create: vi.fn().mockResolvedValue({ ...data, items: [] }) } };
    const repo = new OrdersRepository();

    const result = await repo.create(tx, data);

    expect(tx.order.create).toHaveBeenCalledWith({ data, include: { items: true } });
    expect(result).toEqual({ ...data, items: [] });
  });

  it("findById — items, statusHistory va deliveryOrders.delivery bilan include qiladi", async () => {
    const tx = { order: { findUnique: vi.fn().mockResolvedValue({ id: "o1" }) } };
    const repo = new OrdersRepository();

    await repo.findById(tx, "o1");

    expect(tx.order.findUnique).toHaveBeenCalledWith({
      where: { id: "o1" },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        deliveryOrders: { include: { delivery: true } },
      },
    });
  });

  it("findByIdForPrint — salePoint va item product/unit bilan include qiladi", async () => {
    const tx = { order: { findUnique: vi.fn().mockResolvedValue({ id: "o1" }) } };
    const repo = new OrdersRepository();

    await repo.findByIdForPrint(tx, "o1");

    expect(tx.order.findUnique).toHaveBeenCalledWith({
      where: { id: "o1" },
      include: {
        salePoint: { select: { name: true } },
        items: {
          include: {
            product: { select: { nameUz: true, sku: true } },
            unit: { select: { short: true } },
          },
        },
      },
    });
  });

  it("findByIdempotencyKey — companyId_idempotencyKey unique kalit bilan qidiradi", async () => {
    const tx = { order: { findUnique: vi.fn().mockResolvedValue(null) } };
    const repo = new OrdersRepository();

    await repo.findByIdempotencyKey(tx, "c1", "key-1");

    expect(tx.order.findUnique).toHaveBeenCalledWith({
      where: { companyId_idempotencyKey: { companyId: "c1", idempotencyKey: "key-1" } },
      include: { items: true },
    });
  });

  it("list — filtrlar berilsa where'ga qo'shadi", async () => {
    const tx = { order: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new OrdersRepository();

    await repo.list(tx, "c1", { status: "new", salePointId: "sp1" });

    expect(tx.order.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1", status: "new", salePointId: "sp1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("update — tx.order.update'ni id va data bilan chaqiradi", async () => {
    const tx = { order: { update: vi.fn().mockResolvedValue({ id: "o1" }) } };
    const repo = new OrdersRepository();

    await repo.update(tx, "o1", { status: "confirmed" });

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: { status: "confirmed" },
    });
  });

  it("updateItem — tx.orderItem.update'ni itemId va data bilan chaqiradi", async () => {
    const updated = { id: "oi1", qtyShipped: 2 };
    const tx = { orderItem: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new OrdersRepository();

    const result = await repo.updateItem(tx, "oi1", { qtyShipped: 2 });

    expect(tx.orderItem.update).toHaveBeenCalledWith({
      where: { id: "oi1" },
      data: { qtyShipped: 2 },
    });
    expect(result).toBe(updated);
  });

  it("addStatusHistory — tx.orderStatusHistory.create'ni data bilan chaqiradi", async () => {
    const data = { id: "h1", orderId: "o1", toStatus: "new" };
    const tx = { orderStatusHistory: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new OrdersRepository();

    const result = await repo.addStatusHistory(tx, data);

    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("nextCounter — docType:'order' bilan doc_counters'ni upsert qiladi", async () => {
    const tx = { docCounter: { upsert: vi.fn().mockResolvedValue({ counter: 3 }) } };
    const repo = new OrdersRepository();

    const result = await repo.nextCounter(tx, "c1", 2026);

    expect(tx.docCounter.upsert).toHaveBeenCalledWith({
      where: { companyId_docType_year: { companyId: "c1", docType: "order", year: 2026 } },
      update: { counter: { increment: 1 } },
      create: { companyId: "c1", docType: "order", year: 2026, counter: 1 },
    });
    expect(result).toBe(3);
  });
});
