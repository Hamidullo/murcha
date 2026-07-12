import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { InventoryCountsService } = await import("./inventory-counts.service.js");
const { NotFoundError, ConflictError, ValidationError } = await import("../../lib/errors.js");

describe("InventoryCountsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let inventoryCountsRepository;
  let warehousesRepository;
  let productsRepository;
  let stockRepository;
  let stockMovementsRepository;
  let warehouseDocsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    inventoryCountsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      createItem: vi.fn(),
      findItemById: vi.fn(),
      updateItem: vi.fn(),
    };
    warehousesRepository = { findById: vi.fn() };
    productsRepository = { findById: vi.fn() };
    stockRepository = { list: vi.fn(), findOne: vi.fn(), applyDelta: vi.fn() };
    stockMovementsRepository = { create: vi.fn() };
    warehouseDocsRepository = {
      nextCounter: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue({ id: "d1" }),
      addItem: vi.fn().mockResolvedValue({ id: "i1" }),
    };
    service = new InventoryCountsService({
      inventoryCountsRepository,
      warehousesRepository,
      productsRepository,
      stockMovementsRepository,
      warehouseDocsRepository,
      stockRepository,
    });
  });

  describe("create", () => {
    it("sklad topilmasa NotFoundError otadi", async () => {
      warehousesRepository.findById.mockResolvedValue(null);

      await expect(service.create(auth, { warehouseId: "w1" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("har Stock qatori uchun item yaratadi, systemQty qoldiqdan olinadi", async () => {
      warehousesRepository.findById.mockResolvedValue({ id: "w1" });
      stockRepository.list.mockResolvedValue([
        { productId: "p1", variantId: null, batchId: null, quantity: 10 },
        { productId: "p2", variantId: "v1", batchId: null, quantity: 5 },
      ]);
      inventoryCountsRepository.create.mockResolvedValue({ id: "ic1" });
      inventoryCountsRepository.findById.mockResolvedValue({ id: "ic1", items: [] });

      await service.create(auth, { warehouseId: "w1" });

      expect(stockRepository.list).toHaveBeenCalledWith(fakeTx, "c1", { warehouseId: "w1" });
      expect(inventoryCountsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ companyId: "c1", warehouseId: "w1", status: "in_progress" }),
      );
      expect(inventoryCountsRepository.createItem).toHaveBeenCalledTimes(2);
      expect(inventoryCountsRepository.createItem).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ countId: "ic1", productId: "p1", systemQty: 10 }),
      );
      expect(inventoryCountsRepository.createItem).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ countId: "ic1", productId: "p2", variantId: "v1", systemQty: 5 }),
      );
    });
  });

  it("getById — topilmasa NotFoundError otadi", async () => {
    inventoryCountsRepository.findById.mockResolvedValue(null);

    await expect(service.getById(auth, "ic1")).rejects.toBeInstanceOf(NotFoundError);
  });

  describe("submitCount", () => {
    it("in_progress bo'lmagan inventarizatsiyada ConflictError otadi", async () => {
      inventoryCountsRepository.findById.mockResolvedValue({ id: "ic1", status: "approved" });

      await expect(
        service.submitCount(auth, "ic1", "i1", { countedQty: 5 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("boshqa inventarizatsiyaga tegishli qator bo'lsa NotFoundError otadi", async () => {
      inventoryCountsRepository.findById.mockResolvedValue({ id: "ic1", status: "in_progress" });
      inventoryCountsRepository.findItemById.mockResolvedValue({ id: "i1", countId: "ic2" });

      await expect(
        service.submitCount(auth, "ic1", "i1", { countedQty: 5 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("to'g'ri bo'lsa diff hisoblab yangilaydi", async () => {
      inventoryCountsRepository.findById.mockResolvedValue({ id: "ic1", status: "in_progress" });
      inventoryCountsRepository.findItemById.mockResolvedValue({
        id: "i1",
        countId: "ic1",
        systemQty: 10,
      });
      inventoryCountsRepository.updateItem.mockResolvedValue({ id: "i1", countedQty: 7, diff: -3 });

      const result = await service.submitCount(auth, "ic1", "i1", { countedQty: 7 });

      expect(inventoryCountsRepository.updateItem).toHaveBeenCalledWith(fakeTx, "i1", {
        countedQty: 7,
        diff: -3,
      });
      expect(result).toEqual({ id: "i1", countedQty: 7, diff: -3 });
    });
  });

  describe("approve", () => {
    it("in_progress bo'lmasa ConflictError otadi", async () => {
      inventoryCountsRepository.findById.mockResolvedValue({ id: "ic1", status: "approved" });

      await expect(service.approve(auth, "ic1")).rejects.toBeInstanceOf(ConflictError);
    });

    it("sanoq kiritilmagan qator bo'lsa ValidationError otadi", async () => {
      inventoryCountsRepository.findById.mockResolvedValue({
        id: "ic1",
        status: "in_progress",
        items: [{ id: "i1", countedQty: null, systemQty: 10 }],
      });

      await expect(service.approve(auth, "ic1")).rejects.toBeInstanceOf(ValidationError);
    });

    it("diff 0 bo'lgan qator uchun tuzatish hujjati yaratmaydi", async () => {
      inventoryCountsRepository.findById.mockResolvedValue({
        id: "ic1",
        warehouseId: "w1",
        status: "in_progress",
        items: [{ id: "i1", productId: "p1", countedQty: 10, systemQty: 10 }],
      });
      inventoryCountsRepository.update.mockResolvedValue({ id: "ic1", status: "approved" });

      await service.approve(auth, "ic1");

      expect(productsRepository.findById).not.toHaveBeenCalled();
      expect(warehouseDocsRepository.create).not.toHaveBeenCalled();
      expect(inventoryCountsRepository.update).toHaveBeenCalledWith(
        fakeTx,
        "ic1",
        expect.objectContaining({ status: "approved", approvedBy: "u1" }),
      );
    });

    it("diff != 0 bo'lgan qator uchun tuzatish hujjati yaratadi", async () => {
      inventoryCountsRepository.findById.mockResolvedValue({
        id: "ic1",
        warehouseId: "w1",
        status: "in_progress",
        items: [
          {
            id: "i1",
            productId: "p1",
            variantId: null,
            batchId: null,
            countedQty: 7,
            systemQty: 10,
          },
        ],
      });
      productsRepository.findById.mockResolvedValue({ id: "p1", baseUnitId: "u-dona" });
      inventoryCountsRepository.update.mockResolvedValue({ id: "ic1", status: "approved" });

      await service.approve(auth, "ic1");

      expect(warehouseDocsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ type: "writeoff", status: "confirmed", warehouseId: "w1" }),
      );
      expect(stockRepository.applyDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ productId: "p1", qtyDelta: -3 }),
      );
    });
  });
});
