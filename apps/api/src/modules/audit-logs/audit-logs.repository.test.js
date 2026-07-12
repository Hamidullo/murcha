import { describe, it, expect, vi } from "vitest";
import { AuditLogsRepository } from "./audit-logs.repository.js";

describe("AuditLogsRepository", () => {
  it("create — tx.auditLog.create'ni data bilan chaqiradi", async () => {
    const data = { id: "a1", companyId: "c1", action: "confirm", entityType: "order" };
    const tx = { auditLog: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new AuditLogsRepository();

    const result = await repo.create(tx, data);

    expect(tx.auditLog.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("list — filtrlarsiz companyId bo'yicha findMany qiladi", async () => {
    const tx = { auditLog: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new AuditLogsRepository();

    await repo.list(tx, "c1");

    expect(tx.auditLog.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1" },
      include: { user: { select: { fullName: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("list — entityType/entityId/userId/from/to filtrlari bilan", async () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-02-01");
    const tx = { auditLog: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new AuditLogsRepository();

    await repo.list(tx, "c1", { entityType: "order", entityId: "o1", userId: "u1", from, to });

    expect(tx.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "c1",
          entityType: "order",
          entityId: "o1",
          userId: "u1",
          createdAt: { gte: from, lte: to },
        },
      }),
    );
  });
});
