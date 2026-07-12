import { describe, it, expect, vi } from "vitest";
import { logAudit } from "./audit.js";

describe("logAudit", () => {
  it("auditLogsRepository.create'ni id bilan to'liq data'ni chaqiradi", async () => {
    const tx = {};
    const auditLogsRepository = { create: vi.fn().mockResolvedValue({ id: "a1" }) };

    await logAudit(tx, auditLogsRepository, {
      companyId: "c1",
      userId: "u1",
      action: "confirm",
      entityType: "order",
      entityId: "o1",
      before: { status: "new" },
      after: { status: "confirmed" },
    });

    expect(auditLogsRepository.create).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        companyId: "c1",
        userId: "u1",
        action: "confirm",
        entityType: "order",
        entityId: "o1",
        before: { status: "new" },
        after: { status: "confirmed" },
      }),
    );
  });

  it("before/after berilmasa null qo'yadi", async () => {
    const tx = {};
    const auditLogsRepository = { create: vi.fn().mockResolvedValue({ id: "a1" }) };

    await logAudit(tx, auditLogsRepository, {
      companyId: "c1",
      userId: "u1",
      action: "create",
      entityType: "payment",
      entityId: "p1",
    });

    expect(auditLogsRepository.create).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ before: null, after: null }),
    );
  });
});
