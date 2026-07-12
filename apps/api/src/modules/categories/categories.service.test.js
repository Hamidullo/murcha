import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { CategoriesService } = await import("./categories.service.js");
const { NotFoundError, ValidationError } = await import("../../lib/errors.js");

describe("CategoriesService", () => {
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
    service = new CategoriesService({ categoriesRepository: repo });
  });

  it("create — parentId berilmasa to'g'ridan yaratadi", async () => {
    repo.create.mockResolvedValue({ id: "cat1", nameUz: "Ichimliklar" });

    const result = await service.create(auth, { nameUz: "Ichimliklar" });

    expect(repo.findById).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ companyId: "c1", nameUz: "Ichimliklar" }),
    );
    expect(result).toEqual({ id: "cat1", nameUz: "Ichimliklar" });
  });

  it("create — parentId topilmasa NotFoundError otadi", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.create(auth, { nameUz: "X", parentId: "p1" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("create — parentId topilsa yaratadi", async () => {
    repo.findById.mockResolvedValue({ id: "p1" });
    repo.create.mockResolvedValue({ id: "cat1", parentId: "p1" });

    const result = await service.create(auth, { nameUz: "X", parentId: "p1" });

    expect(result).toEqual({ id: "cat1", parentId: "p1" });
  });

  it("list — repository.list'ni companyId bilan chaqiradi", async () => {
    repo.list.mockResolvedValue([]);

    await service.list(auth);

    expect(repo.list).toHaveBeenCalledWith(fakeTx, "c1");
  });

  it("getById — topilmasa NotFoundError otadi", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.getById(auth, "cat1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update — mavjud bo'lmasa NotFoundError otadi", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.update(auth, "cat1", { nameUz: "Y" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("update — o'zini ota qilib bo'lmaydi", async () => {
    repo.findById.mockResolvedValue({ id: "cat1" });

    await expect(service.update(auth, "cat1", { parentId: "cat1" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("update — parentId topilmasa NotFoundError otadi", async () => {
    repo.findById.mockResolvedValueOnce({ id: "cat1" }).mockResolvedValueOnce(null);

    await expect(service.update(auth, "cat1", { parentId: "p-yoq" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("update — to'g'ri bo'lsa repository.update'ni chaqiradi", async () => {
    repo.findById.mockResolvedValue({ id: "cat1" });
    repo.update.mockResolvedValue({ id: "cat1", nameUz: "Yangi" });

    const result = await service.update(auth, "cat1", { nameUz: "Yangi" });

    expect(repo.update).toHaveBeenCalledWith(fakeTx, "cat1", { nameUz: "Yangi" });
    expect(result).toEqual({ id: "cat1", nameUz: "Yangi" });
  });
});
