import { describe, it, expect, vi } from "vitest";
import { DeliveriesRepository } from "./deliveries.repository.js";

describe("DeliveriesRepository", () => {
  it("create — tx.delivery.create'ni data bilan chaqiradi", async () => {
    const data = { id: "d1", companyId: "c1", courierMemberId: "m1" };
    const tx = { delivery: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new DeliveriesRepository();

    const result = await repo.create(tx, data);

    expect(tx.delivery.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("addOrder — tx.deliveryOrder.create'ni data bilan chaqiradi", async () => {
    const data = { id: "do1", deliveryId: "d1", orderId: "o1", sortOrder: 0 };
    const tx = { deliveryOrder: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new DeliveriesRepository();

    const result = await repo.addOrder(tx, data);

    expect(tx.deliveryOrder.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — orders.order bilan birga include qiladi, sortOrder bo'yicha", async () => {
    const delivery = { id: "d1" };
    const tx = { delivery: { findUnique: vi.fn().mockResolvedValue(delivery) } };
    const repo = new DeliveriesRepository();

    const result = await repo.findById(tx, "d1");

    expect(tx.delivery.findUnique).toHaveBeenCalledWith({
      where: { id: "d1" },
      include: { orders: { include: { order: true }, orderBy: { sortOrder: "asc" } } },
    });
    expect(result).toBe(delivery);
  });

  it("list — companyId va ixtiyoriy filtrlar bilan tx.delivery.findMany'ni chaqiradi", async () => {
    const tx = { delivery: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new DeliveriesRepository();

    await repo.list(tx, "c1", { courierMemberId: "m1", status: "assigned" });

    expect(tx.delivery.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1", courierMemberId: "m1", status: "assigned" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("update — tx.delivery.update'ni id+data bilan chaqiradi", async () => {
    const tx = { delivery: { update: vi.fn().mockResolvedValue({}) } };
    const repo = new DeliveriesRepository();

    await repo.update(tx, "d1", { status: "done" });

    expect(tx.delivery.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { status: "done" },
    });
  });

  it("incrementCashCollected — cashCollected'ni increment bilan yangilaydi", async () => {
    const tx = { delivery: { update: vi.fn().mockResolvedValue({}) } };
    const repo = new DeliveriesRepository();

    await repo.incrementCashCollected(tx, "d1", 5000);

    expect(tx.delivery.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { cashCollected: { increment: 5000 } },
    });
  });

  it("findOrderStop — deliveryId+orderId bo'yicha tx.deliveryOrder.findFirst'ni chaqiradi", async () => {
    const stop = { id: "do1" };
    const tx = { deliveryOrder: { findFirst: vi.fn().mockResolvedValue(stop) } };
    const repo = new DeliveriesRepository();

    const result = await repo.findOrderStop(tx, "d1", "o1");

    expect(tx.deliveryOrder.findFirst).toHaveBeenCalledWith({
      where: { deliveryId: "d1", orderId: "o1" },
    });
    expect(result).toBe(stop);
  });

  it("updateOrderStop — tx.deliveryOrder.update'ni id+data bilan chaqiradi", async () => {
    const tx = { deliveryOrder: { update: vi.fn().mockResolvedValue({}) } };
    const repo = new DeliveriesRepository();

    await repo.updateOrderStop(tx, "do1", { deliveredAt: new Date() });

    expect(tx.deliveryOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "do1" } }),
    );
  });

  it("findByOrderId — orderId bo'yicha tx.deliveryOrder.findFirst'ni chaqiradi", async () => {
    const stop = { id: "do1", acceptCode: "1234" };
    const tx = { deliveryOrder: { findFirst: vi.fn().mockResolvedValue(stop) } };
    const repo = new DeliveriesRepository();

    const result = await repo.findByOrderId(tx, "o1");

    expect(tx.deliveryOrder.findFirst).toHaveBeenCalledWith({ where: { orderId: "o1" } });
    expect(result).toBe(stop);
  });
});
