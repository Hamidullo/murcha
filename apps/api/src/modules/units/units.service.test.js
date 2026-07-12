import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { UnitsService } = await import("./units.service.js");

describe("UnitsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let repo;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    repo = { list: vi.fn() };
    service = new UnitsService({ unitsRepository: repo });
  });

  it("list — repository.list'ni tx bilan chaqiradi", async () => {
    repo.list.mockResolvedValue([{ id: "unit-dona" }]);

    const result = await service.list(auth);

    expect(withTenant).toHaveBeenCalledWith("c1", "u1", expect.any(Function));
    expect(repo.list).toHaveBeenCalledWith(fakeTx);
    expect(result).toEqual([{ id: "unit-dona" }]);
  });
});
