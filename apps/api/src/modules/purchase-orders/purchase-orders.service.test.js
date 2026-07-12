import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { PurchaseOrdersService } = await import("./purchase-orders.service.js");
const { NotFoundError, ConflictError, ValidationError } = await import("../../lib/errors.js");

describe("PurchaseOrdersService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let purchaseOrdersRepository;
  let warehousesRepository;
  let productsRepository;
  let productUnitsRepository;
  let warehouseDocsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    purchaseOrdersRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      addItem: vi.fn(),
      findItemById: vi.fn(),
      removeItem: vi.fn(),
      incrementReceived: vi.fn(),
      nextCounter: vi.fn(),
    };
    warehousesRepository = { findById: vi.fn() };
    productsRepository = { findById: vi.fn() };
    productUnitsRepository = { findByProductAndUnit: vi.fn() };
    warehouseDocsRepository = {
      create: vi.fn(),
      addItem: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      nextCounter: vi.fn(),
    };
    service = new PurchaseOrdersService({
      purchaseOrdersRepository,
      warehousesRepository,
      productsRepository,
      productUnitsRepository,
      warehouseDocsRepository,
    });
  });

  describe("create", () => {
    it("sklad topilmasa NotFoundError otadi", async () => {
      warehousesRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(auth, { supplierId: "s1", warehouseId: "w1" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("to'g'ri bo'lsa PO-YYYY-NNNNN raqami bilan yaratadi", async () => {
      warehousesRepository.findById.mockResolvedValue({ id: "w1" });
      purchaseOrdersRepository.nextCounter.mockResolvedValue(1);
      purchaseOrdersRepository.create.mockResolvedValue({ id: "po1" });

      await service.create(auth, { supplierId: "s1", warehouseId: "w1" });

      const year = new Date().getFullYear();
      expect(purchaseOrdersRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ number: `PO-${year}-00001`, status: "draft", total: 0 }),
      );
    });
  });

  describe("addItem/removeItem — faqat draft", () => {
    it("addItem — confirmed bo'lmagan (sent) PO'da ConflictError otadi", async () => {
      purchaseOrdersRepository.findById.mockResolvedValue({ id: "po1", status: "sent" });

      await expect(
        service.addItem(auth, "po1", { productId: "p1", unitId: "u1", qty: 5, price: 10 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("addItem — mahsulot topilmasa NotFoundError otadi", async () => {
      purchaseOrdersRepository.findById.mockResolvedValue({ id: "po1", status: "draft" });
      productsRepository.findById.mockResolvedValue(null);

      await expect(
        service.addItem(auth, "po1", { productId: "p1", unitId: "u1", qty: 5, price: 10 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("addItem — to'g'ri bo'lsa qo'shadi va totalni qayta hisoblaydi", async () => {
      purchaseOrdersRepository.findById
        .mockResolvedValueOnce({ id: "po1", status: "draft" })
        .mockResolvedValueOnce({ id: "po1", items: [{ qty: 5, price: 10 }] });
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      purchaseOrdersRepository.addItem.mockResolvedValue({ id: "i1" });

      await service.addItem(auth, "po1", { productId: "p1", unitId: "u1", qty: 5, price: 10 });

      expect(purchaseOrdersRepository.update).toHaveBeenCalledWith(fakeTx, "po1", { total: 50 });
    });

    it("removeItem — boshqa POga tegishli qator bo'lsa NotFoundError otadi", async () => {
      purchaseOrdersRepository.findById.mockResolvedValue({ id: "po1", status: "draft" });
      purchaseOrdersRepository.findItemById.mockResolvedValue({ id: "i1", purchaseOrderId: "po2" });

      await expect(service.removeItem(auth, "po1", "i1")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("receive", () => {
    const po = (over) => ({
      id: "po1",
      warehouseId: "w1",
      supplierId: "s1",
      currency: "UZS",
      exchangeRate: null,
      status: "draft",
      items: [
        {
          id: "poi1",
          purchaseOrderId: "po1",
          productId: "p1",
          unitId: "u1",
          qty: 10,
          qtyReceived: 0,
          price: 20,
        },
      ],
      ...over,
    });

    it("received/cancelled POda ConflictError otadi", async () => {
      purchaseOrdersRepository.findById.mockResolvedValue(po({ status: "received" }));

      await expect(
        service.receive(auth, "po1", { items: [{ poItemId: "poi1", qty: 5 }] }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("boshqa POga tegishli qator bo'lsa NotFoundError otadi", async () => {
      purchaseOrdersRepository.findById.mockResolvedValue(po());

      await expect(
        service.receive(auth, "po1", { items: [{ poItemId: "yoq", qty: 5 }] }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("qolgandan ko'p miqdor kiritilsa ValidationError otadi", async () => {
      purchaseOrdersRepository.findById.mockResolvedValue(po());

      await expect(
        service.receive(auth, "po1", { items: [{ poItemId: "poi1", qty: 20 }] }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("qisman qabul qilinsa — draft hujjat yaratadi, qtyReceived oshadi, status partially_received", async () => {
      purchaseOrdersRepository.findById
        .mockResolvedValueOnce(po())
        .mockResolvedValueOnce(po({ items: [{ id: "poi1", qty: 10, qtyReceived: 4 }] }));
      warehouseDocsRepository.nextCounter.mockResolvedValue(1);
      warehouseDocsRepository.create.mockResolvedValue({ id: "d1" });
      productsRepository.findById.mockResolvedValue({ id: "p1", baseUnitId: "u1" });
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1", status: "draft" });

      const result = await service.receive(auth, "po1", { items: [{ poItemId: "poi1", qty: 4 }] });

      expect(warehouseDocsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          type: "receipt",
          warehouseId: "w1",
          purchaseOrderId: "po1",
          status: "draft",
        }),
      );
      expect(warehouseDocsRepository.addItem).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ docId: "d1", productId: "p1", qty: 4, qtyBase: 4, total: 80 }),
      );
      expect(purchaseOrdersRepository.incrementReceived).toHaveBeenCalledWith(fakeTx, "poi1", 4);
      expect(purchaseOrdersRepository.update).toHaveBeenCalledWith(fakeTx, "po1", {
        status: "partially_received",
      });
      expect(result).toEqual({ id: "d1", status: "draft" });
    });

    it("to'liq qabul qilinsa status received bo'ladi", async () => {
      purchaseOrdersRepository.findById
        .mockResolvedValueOnce(po())
        .mockResolvedValueOnce(po({ items: [{ id: "poi1", qty: 10, qtyReceived: 10 }] }));
      warehouseDocsRepository.nextCounter.mockResolvedValue(1);
      warehouseDocsRepository.create.mockResolvedValue({ id: "d1" });
      productsRepository.findById.mockResolvedValue({ id: "p1", baseUnitId: "u1" });
      warehouseDocsRepository.findById.mockResolvedValue({ id: "d1" });

      await service.receive(auth, "po1", { items: [{ poItemId: "poi1", qty: 10 }] });

      expect(purchaseOrdersRepository.update).toHaveBeenCalledWith(fakeTx, "po1", {
        status: "received",
      });
    });
  });
});
