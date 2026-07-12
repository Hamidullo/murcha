import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { WarehouseDocsService } = await import("./warehouse-docs.service.js");
const { NotFoundError, ConflictError, ValidationError, InsufficientStockError } =
  await import("../../lib/errors.js");

describe("WarehouseDocsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let warehouseDocsRepository;
  let warehousesRepository;
  let productsRepository;
  let productUnitsRepository;
  let stockRepository;
  let stockMovementsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    warehouseDocsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      addItem: vi.fn(),
      findItemById: vi.fn(),
      removeItem: vi.fn(),
      nextCounter: vi.fn(),
    };
    warehousesRepository = { findById: vi.fn() };
    productsRepository = { findById: vi.fn() };
    productUnitsRepository = { findByProductAndUnit: vi.fn() };
    stockRepository = { findOne: vi.fn(), applyDelta: vi.fn() };
    stockMovementsRepository = { create: vi.fn() };
    service = new WarehouseDocsService({
      warehouseDocsRepository,
      warehousesRepository,
      productsRepository,
      productUnitsRepository,
      stockRepository,
      stockMovementsRepository,
    });
  });

  describe("create", () => {
    it("sklad topilmasa NotFoundError otadi", async () => {
      warehousesRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(auth, { type: "receipt", warehouseId: "w1" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("transfer'da toWarehouse topilmasa NotFoundError otadi", async () => {
      warehousesRepository.findById.mockResolvedValueOnce({ id: "w1" }).mockResolvedValueOnce(null);

      await expect(
        service.create(auth, { type: "transfer", warehouseId: "w1", toWarehouseId: "w2" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("raqam prefiksi turga qarab hisoblanadi va draft yaratiladi", async () => {
      warehousesRepository.findById.mockResolvedValue({ id: "w1" });
      warehouseDocsRepository.nextCounter.mockResolvedValue(1);
      warehouseDocsRepository.create.mockResolvedValue({ id: "d1", number: "KIR-2026-00001" });

      const result = await service.create(auth, { type: "receipt", warehouseId: "w1" });

      const year = new Date().getFullYear();
      expect(warehouseDocsRepository.nextCounter).toHaveBeenCalledWith(
        fakeTx,
        "c1",
        "receipt",
        year,
      );
      expect(warehouseDocsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyId: "c1",
          type: "receipt",
          number: `KIR-${year}-00001`,
          status: "draft",
          total: 0,
          createdBy: "u1",
        }),
      );
      expect(result).toEqual({ id: "d1", number: "KIR-2026-00001" });
    });
  });

  it("getById — topilmasa NotFoundError otadi", async () => {
    warehouseDocsRepository.findById.mockResolvedValue(null);

    await expect(service.getById(auth, "d1")).rejects.toBeInstanceOf(NotFoundError);
  });

  describe("update/remove — faqat draft", () => {
    it("update — confirmed hujjatda ConflictError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "confirmed" });

      await expect(service.update(auth, "d1", { reason: "x" })).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(warehouseDocsRepository.update).not.toHaveBeenCalled();
    });

    it("update — draft hujjatda repository.update chaqiradi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "draft" });
      warehouseDocsRepository.update.mockResolvedValue({ id: "d1", reason: "x" });

      const result = await service.update(auth, "d1", { reason: "x" });

      expect(warehouseDocsRepository.update).toHaveBeenCalledWith(fakeTx, "d1", { reason: "x" });
      expect(result).toEqual({ id: "d1", reason: "x" });
    });

    it("remove — confirmed hujjatda ConflictError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "confirmed" });

      await expect(service.remove(auth, "d1")).rejects.toBeInstanceOf(ConflictError);
      expect(warehouseDocsRepository.delete).not.toHaveBeenCalled();
    });

    it("remove — draft hujjatni o'chiradi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "draft" });

      await service.remove(auth, "d1");

      expect(warehouseDocsRepository.delete).toHaveBeenCalledWith(fakeTx, "d1");
    });
  });

  describe("addItem", () => {
    it("confirmed hujjatga qo'shishga urinsa ConflictError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "confirmed" });

      await expect(
        service.addItem(auth, "d1", { productId: "p1", unitId: "u1", qty: 5 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("mahsulot topilmasa NotFoundError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "draft" });
      productsRepository.findById.mockResolvedValue(null);

      await expect(
        service.addItem(auth, "d1", { productId: "p1", unitId: "u1", qty: 5 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("asosiy birlik bilan qtyBase = qty", async () => {
      warehouseDocsRepository.findById
        .mockResolvedValueOnce({ id: "d1", status: "draft" })
        .mockResolvedValueOnce({ id: "d1", items: [{ total: 100 }] });
      productsRepository.findById.mockResolvedValue({ id: "p1", baseUnitId: "u1" });
      warehouseDocsRepository.addItem.mockResolvedValue({ id: "i1", qtyBase: 5 });

      await service.addItem(auth, "d1", { productId: "p1", unitId: "u1", qty: 5, price: 20 });

      expect(warehouseDocsRepository.addItem).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ qtyBase: 5, total: 100 }),
      );
      expect(warehouseDocsRepository.update).toHaveBeenCalledWith(fakeTx, "d1", { total: 100 });
    });

    it("boshqa birlik factor orqali qtyBase'ga o'giradi", async () => {
      warehouseDocsRepository.findById
        .mockResolvedValueOnce({ id: "d1", status: "draft" })
        .mockResolvedValueOnce({ id: "d1", items: [] });
      productsRepository.findById.mockResolvedValue({ id: "p1", baseUnitId: "u-dona" });
      productUnitsRepository.findByProductAndUnit.mockResolvedValue({ factor: 20 });
      warehouseDocsRepository.addItem.mockResolvedValue({ id: "i1" });

      await service.addItem(auth, "d1", { productId: "p1", unitId: "u-blok", qty: 3 });

      expect(warehouseDocsRepository.addItem).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ qtyBase: 60 }),
      );
    });

    it("ulanmagan birlik ValidationError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "draft" });
      productsRepository.findById.mockResolvedValue({ id: "p1", baseUnitId: "u-dona" });
      productUnitsRepository.findByProductAndUnit.mockResolvedValue(null);

      await expect(
        service.addItem(auth, "d1", { productId: "p1", unitId: "u-x", qty: 3 }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("removeItem", () => {
    it("boshqa hujjatga tegishli qator bo'lsa NotFoundError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "draft" });
      warehouseDocsRepository.findItemById.mockResolvedValue({ id: "i1", docId: "d2" });

      await expect(service.removeItem(auth, "d1", "i1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("o'chiradi va totalni qayta hisoblaydi", async () => {
      warehouseDocsRepository.findById
        .mockResolvedValueOnce({ id: "d1", status: "draft" })
        .mockResolvedValueOnce({ id: "d1", items: [] });
      warehouseDocsRepository.findItemById.mockResolvedValue({ id: "i1", docId: "d1" });

      await service.removeItem(auth, "d1", "i1");

      expect(warehouseDocsRepository.removeItem).toHaveBeenCalledWith(fakeTx, "i1");
      expect(warehouseDocsRepository.update).toHaveBeenCalledWith(fakeTx, "d1", { total: 0 });
    });
  });

  describe("confirm", () => {
    const item = (over) => ({
      id: "i1",
      productId: "p1",
      variantId: null,
      batchId: null,
      qtyBase: 10,
      price: 5,
      ...over,
    });

    it("draft bo'lmasa ConflictError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "confirmed" });

      await expect(service.confirm(auth, "d1")).rejects.toBeInstanceOf(ConflictError);
    });

    it("qatorsiz hujjatda ValidationError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "draft", items: [] });

      await expect(service.confirm(auth, "d1")).rejects.toBeInstanceOf(ValidationError);
    });

    it("receipt — qoldiqqa musbat qo'shadi va movement yozadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({
        id: "d1",
        type: "receipt",
        warehouseId: "w1",
        status: "draft",
        items: [item()],
      });
      warehouseDocsRepository.update.mockResolvedValue({ id: "d1", status: "confirmed" });

      const result = await service.confirm(auth, "d1");

      expect(stockRepository.findOne).not.toHaveBeenCalled();
      expect(stockRepository.applyDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ warehouseId: "w1", productId: "p1", qtyDelta: 10 }),
      );
      expect(stockMovementsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          warehouseId: "w1",
          productId: "p1",
          docType: "receipt",
          docId: "d1",
          docItemId: "i1",
          qty: 10,
          costPrice: 5,
        }),
      );
      expect(warehouseDocsRepository.update).toHaveBeenCalledWith(
        fakeTx,
        "d1",
        expect.objectContaining({ status: "confirmed", confirmedBy: "u1" }),
      );
      expect(result).toEqual({ id: "d1", status: "confirmed" });
    });

    it("issue — yetarli qoldiq bo'lsa manfiy harakat qiladi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({
        id: "d1",
        type: "issue",
        warehouseId: "w1",
        status: "draft",
        items: [item()],
      });
      stockRepository.findOne.mockResolvedValue({ quantity: 20 });

      await service.confirm(auth, "d1");

      expect(stockRepository.applyDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ qtyDelta: -10 }),
      );
      expect(stockMovementsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ qty: -10 }),
      );
    });

    it("issue — yetarli qoldiq bo'lmasa InsufficientStockError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({
        id: "d1",
        type: "issue",
        warehouseId: "w1",
        status: "draft",
        items: [item({ qtyBase: 10 })],
      });
      stockRepository.findOne.mockResolvedValue({ quantity: 5 });

      await expect(service.confirm(auth, "d1")).rejects.toBeInstanceOf(InsufficientStockError);
      expect(stockRepository.applyDelta).not.toHaveBeenCalled();
    });

    it("qoldiq mavjud bo'lmasa (birinchi harakat) 0 deb hisoblaydi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({
        id: "d1",
        type: "writeoff",
        warehouseId: "w1",
        status: "draft",
        items: [item({ qtyBase: 1 })],
      });
      stockRepository.findOne.mockResolvedValue(null);

      await expect(service.confirm(auth, "d1")).rejects.toBeInstanceOf(InsufficientStockError);
    });

    it("transfer — ikkala skladga ham harakat qiladi, chiqish avval qulflanadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({
        id: "d1",
        type: "transfer",
        warehouseId: "w2",
        toWarehouseId: "w1",
        status: "draft",
        items: [item()],
      });
      stockRepository.findOne.mockResolvedValue({ quantity: 100 });

      await service.confirm(auth, "d1");

      expect(stockRepository.applyDelta).toHaveBeenNthCalledWith(
        1,
        fakeTx,
        expect.objectContaining({ warehouseId: "w1", qtyDelta: 10 }),
      );
      expect(stockRepository.applyDelta).toHaveBeenNthCalledWith(
        2,
        fakeTx,
        expect.objectContaining({ warehouseId: "w2", qtyDelta: -10 }),
      );
    });
  });

  describe("cancel", () => {
    const item = (over) => ({
      id: "i1",
      productId: "p1",
      variantId: null,
      batchId: null,
      qtyBase: 10,
      price: 5,
      ...over,
    });

    it("draft (hali tasdiqlanmagan) hujjatda ConflictError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "draft" });

      await expect(service.cancel(auth, "d1")).rejects.toBeInstanceOf(ConflictError);
    });

    it("cancelled hujjatni qayta bekor qilib bo'lmaydi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "cancelled" });

      await expect(service.cancel(auth, "d1")).rejects.toBeInstanceOf(ConflictError);
    });

    it("receipt storno — qoldiqdan ayiradi (teskari harakat)", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({
        id: "d1",
        type: "receipt",
        warehouseId: "w1",
        status: "confirmed",
        items: [item()],
      });
      stockRepository.findOne.mockResolvedValue({ quantity: 10 });
      warehouseDocsRepository.update.mockResolvedValue({ id: "d1", status: "cancelled" });

      const result = await service.cancel(auth, "d1");

      expect(stockRepository.applyDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ warehouseId: "w1", qtyDelta: -10 }),
      );
      expect(stockMovementsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ docId: "d1", docItemId: "i1", qty: -10 }),
      );
      expect(warehouseDocsRepository.update).toHaveBeenCalledWith(fakeTx, "d1", {
        status: "cancelled",
      });
      expect(result).toEqual({ id: "d1", status: "cancelled" });
    });

    it("receipt storno — stock allaqachon sarflangan bo'lsa InsufficientStockError otadi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({
        id: "d1",
        type: "receipt",
        warehouseId: "w1",
        status: "confirmed",
        items: [item({ qtyBase: 10 })],
      });
      stockRepository.findOne.mockResolvedValue({ quantity: 3 });

      await expect(service.cancel(auth, "d1")).rejects.toBeInstanceOf(InsufficientStockError);
    });

    it("issue storno — qoldiqqa qaytaradi (musbat harakat)", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({
        id: "d1",
        type: "issue",
        warehouseId: "w1",
        status: "confirmed",
        items: [item()],
      });

      await service.cancel(auth, "d1");

      expect(stockRepository.findOne).not.toHaveBeenCalled();
      expect(stockRepository.applyDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ warehouseId: "w1", qtyDelta: 10 }),
      );
      expect(stockMovementsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ qty: 10 }),
      );
    });

    it("transfer storno — yo'nalishlar teskari bo'ladi", async () => {
      warehouseDocsRepository.findById.mockResolvedValue({
        id: "d1",
        type: "transfer",
        warehouseId: "w2",
        toWarehouseId: "w1",
        status: "confirmed",
        items: [item()],
      });
      stockRepository.findOne.mockResolvedValue({ quantity: 100 });

      await service.cancel(auth, "d1");

      expect(stockRepository.applyDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ warehouseId: "w1", qtyDelta: -10 }),
      );
      expect(stockRepository.applyDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ warehouseId: "w2", qtyDelta: 10 }),
      );
    });
  });
});
