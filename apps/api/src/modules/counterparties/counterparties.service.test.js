import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { CounterpartiesService } = await import("./counterparties.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("CounterpartiesService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let repo;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    repo = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    };
    service = new CounterpartiesService({ counterpartiesRepository: repo });
  });

  it("create — companyId bilan repository.create'ni chaqiradi", async () => {
    repo.create.mockResolvedValue({ id: "cp1", name: "Aziz Trade" });

    const result = await service.create(auth, { type: "supplier", name: "Aziz Trade" });

    expect(repo.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ companyId: "c1", type: "supplier", name: "Aziz Trade" }),
    );
    expect(result).toEqual({ id: "cp1", name: "Aziz Trade" });
  });

  it("list — repository.list'ni companyId va filtrlar bilan chaqiradi", async () => {
    repo.list.mockResolvedValue([{ id: "cp1" }]);

    const result = await service.list(auth, { type: "customer" });

    expect(repo.list).toHaveBeenCalledWith(fakeTx, "c1", { type: "customer" });
    expect(result).toEqual([{ id: "cp1" }]);
  });

  it("getById — topilmasa NotFoundError otadi", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.getById(auth, "cp1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update — topilmasa NotFoundError otadi", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.update(auth, "cp1", { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("archive — isActive:false va deletedAt bilan yangilaydi", async () => {
    repo.findById.mockResolvedValue({ id: "cp1" });
    repo.update.mockResolvedValue({ id: "cp1", isActive: false });

    const result = await service.archive(auth, "cp1");

    expect(repo.update).toHaveBeenCalledWith(
      fakeTx,
      "cp1",
      expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
    );
    expect(result).toEqual({ id: "cp1", isActive: false });
  });
});
