import { describe, it, expect, vi } from "vitest";
import { PushSubscriptionsRepository } from "./push-subscriptions.repository.js";

describe("PushSubscriptionsRepository", () => {
  it("upsert — endpoint bo'yicha tx.pushSubscription.upsert'ni chaqiradi", async () => {
    const data = {
      id: "ps1",
      userId: "u1",
      endpoint: "https://push.example/1",
      p256dh: "p",
      auth: "a",
    };
    const tx = { pushSubscription: { upsert: vi.fn().mockResolvedValue(data) } };
    const repo = new PushSubscriptionsRepository();

    const result = await repo.upsert(tx, data);

    expect(tx.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: data.endpoint },
      create: data,
      update: { userId: data.userId, p256dh: data.p256dh, auth: data.auth },
    });
    expect(result).toBe(data);
  });

  it("findById — tx.pushSubscription.findUnique'ni id bilan chaqiradi", async () => {
    const subscription = { id: "ps1" };
    const tx = { pushSubscription: { findUnique: vi.fn().mockResolvedValue(subscription) } };
    const repo = new PushSubscriptionsRepository();

    const result = await repo.findById(tx, "ps1");

    expect(tx.pushSubscription.findUnique).toHaveBeenCalledWith({ where: { id: "ps1" } });
    expect(result).toBe(subscription);
  });

  it("listByUser — tx.pushSubscription.findMany'ni userId bilan chaqiradi", async () => {
    const tx = { pushSubscription: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new PushSubscriptionsRepository();

    await repo.listByUser(tx, "u1");

    expect(tx.pushSubscription.findMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });

  it("remove — tx.pushSubscription.delete'ni id bilan chaqiradi", async () => {
    const tx = { pushSubscription: { delete: vi.fn().mockResolvedValue({}) } };
    const repo = new PushSubscriptionsRepository();

    await repo.remove(tx, "ps1");

    expect(tx.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: "ps1" } });
  });
});
