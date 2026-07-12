import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { ProductsService } = await import("./products.service.js");
const { NotFoundError, ConflictError } = await import("../../lib/errors.js");

describe("ProductsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  const dto = { sku: "SKU-1", nameUz: "Non", baseUnitId: "unit-dona" };
  let productsRepository;
  let categoriesRepository;
  let unitsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    productsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySku: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    };
    categoriesRepository = { findById: vi.fn() };
    unitsRepository = { findById: vi.fn() };
    service = new ProductsService({ productsRepository, categoriesRepository, unitsRepository });
  });

  describe("create", () => {
    it("SKU band bo'lsa ConflictError otadi", async () => {
      productsRepository.findBySku.mockResolvedValue({ id: "p-existing" });

      await expect(service.create(auth, dto)).rejects.toBeInstanceOf(ConflictError);
      expect(unitsRepository.findById).not.toHaveBeenCalled();
      expect(productsRepository.create).not.toHaveBeenCalled();
    });

    it("baseUnitId topilmasa NotFoundError otadi", async () => {
      productsRepository.findBySku.mockResolvedValue(null);
      unitsRepository.findById.mockResolvedValue(null);

      await expect(service.create(auth, dto)).rejects.toBeInstanceOf(NotFoundError);
      expect(productsRepository.create).not.toHaveBeenCalled();
    });

    it("categoryId topilmasa NotFoundError otadi", async () => {
      productsRepository.findBySku.mockResolvedValue(null);
      unitsRepository.findById.mockResolvedValue({ id: "unit-dona" });
      categoriesRepository.findById.mockResolvedValue(null);

      await expect(service.create(auth, { ...dto, categoryId: "cat1" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("hammasi to'g'ri bo'lsa yaratadi", async () => {
      productsRepository.findBySku.mockResolvedValue(null);
      unitsRepository.findById.mockResolvedValue({ id: "unit-dona" });
      productsRepository.create.mockResolvedValue({ id: "p1", ...dto });

      const result = await service.create(auth, dto);

      expect(productsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ companyId: "c1", sku: "SKU-1" }),
      );
      expect(result).toEqual({ id: "p1", ...dto });
    });
  });

  describe("list", () => {
    it("repository.list'ni companyId bilan chaqiradi", async () => {
      productsRepository.list.mockResolvedValue([]);

      await service.list(auth);

      expect(productsRepository.list).toHaveBeenCalledWith(fakeTx, "c1");
    });
  });

  describe("getById", () => {
    it("topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.getById(auth, "p1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("topsa qaytaradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });

      const result = await service.getById(auth, "p1");

      expect(result).toEqual({ id: "p1" });
    });
  });

  describe("update", () => {
    it("mavjud bo'lmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.update(auth, "p1", { nameUz: "Y" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("boshqa mahsulot shu SKU'ni band qilgan bo'lsa ConflictError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1", sku: "SKU-1" });
      productsRepository.findBySku.mockResolvedValue({ id: "p2", sku: "SKU-2" });

      await expect(service.update(auth, "p1", { sku: "SKU-2" })).rejects.toBeInstanceOf(
        ConflictError,
      );
    });

    it("to'g'ri bo'lsa repository.update'ni chaqiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1", sku: "SKU-1" });
      productsRepository.update.mockResolvedValue({ id: "p1", nameUz: "Yangi" });

      const result = await service.update(auth, "p1", { nameUz: "Yangi" });

      expect(productsRepository.update).toHaveBeenCalledWith(fakeTx, "p1", { nameUz: "Yangi" });
      expect(result).toEqual({ id: "p1", nameUz: "Yangi" });
    });
  });

  describe("archive", () => {
    it("mavjud bo'lmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.archive(auth, "p1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("mavjud bo'lsa status:archived + deletedAt bilan yangilaydi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productsRepository.update.mockResolvedValue({ id: "p1", status: "archived" });

      await service.archive(auth, "p1");

      expect(productsRepository.update).toHaveBeenCalledWith(
        fakeTx,
        "p1",
        expect.objectContaining({ status: "archived", deletedAt: expect.any(Date) }),
      );
    });
  });
});
