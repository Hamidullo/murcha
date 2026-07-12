import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { PriceTypesService } = await import("./price-types.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("PriceTypesService", () => {
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
      unsetDefault: vi.fn(),
    };
    service = new PriceTypesService({ priceTypesRepository: repo });
  });

  describe("create", () => {
    it("isDefault berilmasa unsetDefault chaqirilmaydi", async () => {
      repo.create.mockResolvedValue({ id: "pt1", name: "Chakana" });

      await service.create(auth, { name: "Chakana" });

      expect(repo.unsetDefault).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ companyId: "c1", name: "Chakana" }),
      );
    });

    it("isDefault:true bo'lsa avval unsetDefault chaqiriladi", async () => {
      repo.create.mockResolvedValue({ id: "pt1", name: "Ulgurji", isDefault: true });

      await service.create(auth, { name: "Ulgurji", isDefault: true });

      expect(repo.unsetDefault).toHaveBeenCalledWith(fakeTx, "c1", null);
    });
  });

  describe("list", () => {
    it("repository.list'ni companyId bilan chaqiradi", async () => {
      repo.list.mockResolvedValue([]);

      await service.list(auth);

      expect(repo.list).toHaveBeenCalledWith(fakeTx, "c1");
    });
  });

  describe("getById", () => {
    it("topilmasa NotFoundError otadi", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById(auth, "pt1")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("update", () => {
    it("mavjud bo'lmasa NotFoundError otadi", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update(auth, "pt1", { name: "Y" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("isDefault:true bo'lsa unsetDefault o'zini mustasno qilib chaqiradi", async () => {
      repo.findById.mockResolvedValue({ id: "pt1" });
      repo.update.mockResolvedValue({ id: "pt1", isDefault: true });

      await service.update(auth, "pt1", { isDefault: true });

      expect(repo.unsetDefault).toHaveBeenCalledWith(fakeTx, "c1", "pt1");
    });
  });
});
