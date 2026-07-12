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
  let productUnitsRepository;
  let productBarcodesRepository;
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
    productUnitsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByProductAndUnit: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    };
    productBarcodesRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByBarcode: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    };
    service = new ProductsService({
      productsRepository,
      categoriesRepository,
      unitsRepository,
      productUnitsRepository,
      productBarcodesRepository,
    });
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
    it("repository.list'ni companyId bilan chaqiradi (filtrsiz)", async () => {
      productsRepository.list.mockResolvedValue([]);

      await service.list(auth);

      expect(productsRepository.list).toHaveBeenCalledWith(fakeTx, "c1", {});
    });

    it("repository.list'ga filtrlarni uzatadi", async () => {
      productsRepository.list.mockResolvedValue([]);

      await service.list(auth, { search: "non", categoryId: "cat1" });

      expect(productsRepository.list).toHaveBeenCalledWith(fakeTx, "c1", {
        search: "non",
        categoryId: "cat1",
      });
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

  describe("addUnit", () => {
    it("mahsulot topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(
        service.addUnit(auth, "p1", { unitId: "unit-blok", factor: 20 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("asosiy birlikni qo'shishga urinsa ConflictError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1", baseUnitId: "unit-dona" });

      await expect(
        service.addUnit(auth, "p1", { unitId: "unit-dona", factor: 1 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("birlik topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1", baseUnitId: "unit-dona" });
      unitsRepository.findById.mockResolvedValue(null);

      await expect(
        service.addUnit(auth, "p1", { unitId: "unit-blok", factor: 20 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("bu birlik allaqachon qo'shilgan bo'lsa ConflictError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1", baseUnitId: "unit-dona" });
      unitsRepository.findById.mockResolvedValue({ id: "unit-blok" });
      productUnitsRepository.findByProductAndUnit.mockResolvedValue({ id: "pu-existing" });

      await expect(
        service.addUnit(auth, "p1", { unitId: "unit-blok", factor: 20 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("hammasi to'g'ri bo'lsa yaratadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1", baseUnitId: "unit-dona" });
      unitsRepository.findById.mockResolvedValue({ id: "unit-blok" });
      productUnitsRepository.findByProductAndUnit.mockResolvedValue(null);
      productUnitsRepository.create.mockResolvedValue({ id: "pu1", factor: 20 });

      const result = await service.addUnit(auth, "p1", { unitId: "unit-blok", factor: 20 });

      expect(productUnitsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ productId: "p1", unitId: "unit-blok", factor: 20 }),
      );
      expect(result).toEqual({ id: "pu1", factor: 20 });
    });
  });

  describe("listUnits", () => {
    it("mahsulot topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.listUnits(auth, "p1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("repository.list'ni productId bilan chaqiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productUnitsRepository.list.mockResolvedValue([]);

      await service.listUnits(auth, "p1");

      expect(productUnitsRepository.list).toHaveBeenCalledWith(fakeTx, "p1");
    });
  });

  describe("removeUnit", () => {
    it("o'ram birligi boshqa mahsulotga tegishli bo'lsa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productUnitsRepository.findById.mockResolvedValue({ id: "pu1", productId: "p2" });

      await expect(service.removeUnit(auth, "p1", "pu1")).rejects.toBeInstanceOf(NotFoundError);
      expect(productUnitsRepository.delete).not.toHaveBeenCalled();
    });

    it("to'g'ri bo'lsa o'chiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productUnitsRepository.findById.mockResolvedValue({ id: "pu1", productId: "p1" });

      await service.removeUnit(auth, "p1", "pu1");

      expect(productUnitsRepository.delete).toHaveBeenCalledWith(fakeTx, "pu1");
    });
  });

  describe("addBarcode", () => {
    it("mahsulot topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(
        service.addBarcode(auth, "p1", { barcode: "4780000000017" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("shtrix-kod band bo'lsa ConflictError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productBarcodesRepository.findByBarcode.mockResolvedValue({ id: "b-existing" });

      await expect(
        service.addBarcode(auth, "p1", { barcode: "4780000000017" }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("hammasi to'g'ri bo'lsa yaratadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productBarcodesRepository.findByBarcode.mockResolvedValue(null);
      productBarcodesRepository.create.mockResolvedValue({ id: "b1", barcode: "4780000000017" });

      const result = await service.addBarcode(auth, "p1", { barcode: "4780000000017" });

      expect(productBarcodesRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyId: "c1",
          productId: "p1",
          barcode: "4780000000017",
        }),
      );
      expect(result).toEqual({ id: "b1", barcode: "4780000000017" });
    });
  });

  describe("listBarcodes", () => {
    it("repository.list'ni productId bilan chaqiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productBarcodesRepository.list.mockResolvedValue([]);

      await service.listBarcodes(auth, "p1");

      expect(productBarcodesRepository.list).toHaveBeenCalledWith(fakeTx, "p1");
    });
  });

  describe("removeBarcode", () => {
    it("shtrix-kod boshqa mahsulotga tegishli bo'lsa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productBarcodesRepository.findById.mockResolvedValue({ id: "b1", productId: "p2" });

      await expect(service.removeBarcode(auth, "p1", "b1")).rejects.toBeInstanceOf(NotFoundError);
      expect(productBarcodesRepository.delete).not.toHaveBeenCalled();
    });

    it("to'g'ri bo'lsa o'chiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productBarcodesRepository.findById.mockResolvedValue({ id: "b1", productId: "p1" });

      await service.removeBarcode(auth, "p1", "b1");

      expect(productBarcodesRepository.delete).toHaveBeenCalledWith(fakeTx, "b1");
    });
  });

  describe("getByBarcode", () => {
    it("shtrix-kod topilmasa NotFoundError otadi", async () => {
      productBarcodesRepository.findByBarcode.mockResolvedValue(null);

      await expect(service.getByBarcode(auth, "4780000000017")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("mahsulot arxivlangan bo'lsa NotFoundError otadi", async () => {
      productBarcodesRepository.findByBarcode.mockResolvedValue({ productId: "p1" });
      productsRepository.findById.mockResolvedValue({ id: "p1", deletedAt: new Date() });

      await expect(service.getByBarcode(auth, "4780000000017")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("topsa mahsulotni qaytaradi", async () => {
      productBarcodesRepository.findByBarcode.mockResolvedValue({ productId: "p1" });
      productsRepository.findById.mockResolvedValue({ id: "p1", nameUz: "Non", deletedAt: null });

      const result = await service.getByBarcode(auth, "4780000000017");

      expect(productBarcodesRepository.findByBarcode).toHaveBeenCalledWith(fakeTx, "4780000000017");
      expect(result).toEqual({ id: "p1", nameUz: "Non", deletedAt: null });
    });
  });
});
