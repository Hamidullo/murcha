import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { WarehousesService } = await import("./warehouses.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("WarehousesService", () => {
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
    service = new WarehousesService({ warehousesRepository: repo });
  });

  it("create — yangi id va companyId bilan repository.create'ni chaqiradi", async () => {
    repo.create.mockResolvedValue({ id: "w1", name: "Markaziy" });

    const result = await service.create(auth, { name: "Markaziy" });

    expect(withTenant).toHaveBeenCalledWith("c1", "u1", expect.any(Function));
    expect(repo.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ companyId: "c1", name: "Markaziy" }),
    );
    expect(result).toEqual({ id: "w1", name: "Markaziy" });
  });

  it("list — repository.list'ni companyId bilan chaqiradi", async () => {
    repo.list.mockResolvedValue([{ id: "w1" }]);

    const result = await service.list(auth);

    expect(repo.list).toHaveBeenCalledWith(fakeTx, "c1");
    expect(result).toEqual([{ id: "w1" }]);
  });

  it("getById — topilmasa NotFoundError otadi", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.getById(auth, "w1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("getById — topsa qaytaradi", async () => {
    repo.findById.mockResolvedValue({ id: "w1" });

    const result = await service.getById(auth, "w1");

    expect(result).toEqual({ id: "w1" });
  });

  it("update — mavjud bo'lmasa NotFoundError otadi", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.update(auth, "w1", { name: "Yangi" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("update — mavjud bo'lsa repository.update'ni chaqiradi", async () => {
    repo.findById.mockResolvedValue({ id: "w1", name: "Eski" });
    repo.update.mockResolvedValue({ id: "w1", name: "Yangi" });

    const result = await service.update(auth, "w1", { name: "Yangi" });

    expect(repo.update).toHaveBeenCalledWith(fakeTx, "w1", { name: "Yangi" });
    expect(result).toEqual({ id: "w1", name: "Yangi" });
  });
});
