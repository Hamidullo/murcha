import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { AuditLogsService } = await import("./audit-logs.service.js");

describe("AuditLogsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let auditLogsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    auditLogsRepository = { list: vi.fn() };
    service = new AuditLogsService({ auditLogsRepository });
  });

  it("list — repository.list'ni companyId+filtrlar bilan chaqiradi", async () => {
    auditLogsRepository.list.mockResolvedValue([{ id: "a1" }]);

    const result = await service.list(auth, { entityType: "order" });

    expect(auditLogsRepository.list).toHaveBeenCalledWith(fakeTx, "c1", { entityType: "order" });
    expect(result).toEqual([{ id: "a1" }]);
  });
});
