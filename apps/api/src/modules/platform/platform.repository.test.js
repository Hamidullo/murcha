import { describe, it, expect, vi } from "vitest";
import { PlatformRepository } from "./platform.repository.js";

describe("PlatformRepository", () => {
  it("listCompanies — filtrsiz barcha kompaniyalarni subscription bilan qaytaradi", async () => {
    const tx = { company: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new PlatformRepository();

    await repo.listCompanies(tx);

    expect(tx.company.findMany).toHaveBeenCalledWith({
      where: {},
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("listCompanies — search filtri bilan", async () => {
    const tx = { company: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new PlatformRepository();

    await repo.listCompanies(tx, { search: "Murcha" });

    expect(tx.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { contains: "Murcha", mode: "insensitive" } },
      }),
    );
  });

  it("getCompany — tx.company.findUnique'ni id+subscription include bilan chaqiradi", async () => {
    const data = { id: "c1", subscription: null };
    const tx = { company: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new PlatformRepository();

    const result = await repo.getCompany(tx, "c1");

    expect(tx.company.findUnique).toHaveBeenCalledWith({
      where: { id: "c1" },
      include: { subscription: true },
    });
    expect(result).toBe(data);
  });

  it("upsertSubscription — mavjud bo'lmasa create branch'ida id ishlatiladi", async () => {
    const tx = { subscription: { upsert: vi.fn().mockResolvedValue({}) } };
    const repo = new PlatformRepository();

    await repo.upsertSubscription(tx, "c1", { id: "s1", plan: "start" });

    expect(tx.subscription.upsert).toHaveBeenCalledWith({
      where: { companyId: "c1" },
      update: { plan: "start" },
      create: { id: "s1", companyId: "c1", plan: "start", status: "trial", limits: {} },
    });
  });
});
