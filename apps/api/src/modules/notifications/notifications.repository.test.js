import { describe, it, expect, vi } from "vitest";
import { NotificationsRepository } from "./notifications.repository.js";

describe("NotificationsRepository", () => {
  it("create — tx.notification.create'ni data bilan chaqiradi", async () => {
    const data = { id: "n1", companyId: "c1", userId: "u1", type: "order.new" };
    const tx = { notification: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new NotificationsRepository();

    const result = await repo.create(tx, data);

    expect(tx.notification.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("listByUser — filtersiz userId bo'yicha, createdAt desc tartibda qidiradi", async () => {
    const tx = { notification: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new NotificationsRepository();

    await repo.listByUser(tx, "u1");

    expect(tx.notification.findMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("listByUser — unreadOnly bo'lsa readAt:null filtrini qo'shadi", async () => {
    const tx = { notification: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new NotificationsRepository();

    await repo.listByUser(tx, "u1", { unreadOnly: true });

    expect(tx.notification.findMany).toHaveBeenCalledWith({
      where: { userId: "u1", readAt: null },
      orderBy: { createdAt: "desc" },
    });
  });

  it("findById — tx.notification.findUnique'ni id bilan chaqiradi", async () => {
    const notification = { id: "n1" };
    const tx = { notification: { findUnique: vi.fn().mockResolvedValue(notification) } };
    const repo = new NotificationsRepository();

    const result = await repo.findById(tx, "n1");

    expect(tx.notification.findUnique).toHaveBeenCalledWith({ where: { id: "n1" } });
    expect(result).toBe(notification);
  });

  it("markRead — readAt'ni joriy vaqt bilan yangilaydi", async () => {
    const tx = { notification: { update: vi.fn().mockResolvedValue({ id: "n1" }) } };
    const repo = new NotificationsRepository();

    await repo.markRead(tx, "n1");

    expect(tx.notification.update).toHaveBeenCalledWith({
      where: { id: "n1" },
      data: { readAt: expect.any(Date) },
    });
  });
});
