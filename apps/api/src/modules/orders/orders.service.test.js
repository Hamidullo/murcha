import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { OrdersService } = await import("./orders.service.js");
const { NotFoundError, ForbiddenError, ConflictError, ValidationError, InsufficientStockError } =
  await import("../../lib/errors.js");

describe("OrdersService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let ordersRepository;
  let salePointsRepository;
  let counterpartiesRepository;
  let warehousesRepository;
  let productsRepository;
  let productUnitsRepository;
  let productPricesRepository;
  let userAssignmentsRepository;
  let rolesRepository;
  let stockRepository;
  let stockMovementsRepository;
  let warehouseDocsRepository;
  let service;

  const dto = {
    warehouseId: "w1",
    idempotencyKey: "key-1",
    items: [{ productId: "p1", unitId: "u-dona", qty: 2 }],
  };

  beforeEach(() => {
    withTenant.mockClear();
    ordersRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      list: vi.fn(),
      update: vi.fn(),
      updateItem: vi.fn(),
      addStatusHistory: vi.fn(),
      nextCounter: vi.fn().mockResolvedValue(1),
    };
    salePointsRepository = { findById: vi.fn() };
    counterpartiesRepository = { findById: vi.fn() };
    warehousesRepository = { findById: vi.fn() };
    productsRepository = { findById: vi.fn() };
    productUnitsRepository = { findByProductAndUnit: vi.fn() };
    productPricesRepository = { listCurrentByProduct: vi.fn() };
    userAssignmentsRepository = { findSalePointIdForUser: vi.fn() };
    rolesRepository = { hasPermission: vi.fn() };
    stockRepository = { findOne: vi.fn(), applyDelta: vi.fn(), applyReservedDelta: vi.fn() };
    stockMovementsRepository = { create: vi.fn() };
    warehouseDocsRepository = {
      nextCounter: vi.fn().mockResolvedValue(1),
      create: vi.fn(),
      addItem: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
    };
    service = new OrdersService({
      ordersRepository,
      salePointsRepository,
      counterpartiesRepository,
      warehousesRepository,
      productsRepository,
      productUnitsRepository,
      productPricesRepository,
      userAssignmentsRepository,
      rolesRepository,
      stockRepository,
      stockMovementsRepository,
      warehouseDocsRepository,
    });
  });

  describe("create", () => {
    it("idempotencyKey mavjud bo'lsa mavjud zakazni qaytaradi, yangisini yaratmaydi", async () => {
      const existing = { id: "o1", idempotencyKey: "key-1" };
      ordersRepository.findByIdempotencyKey.mockResolvedValue(existing);

      const result = await service.create(auth, dto);

      expect(result).toBe(existing);
      expect(userAssignmentsRepository.findSalePointIdForUser).not.toHaveBeenCalled();
      expect(ordersRepository.create).not.toHaveBeenCalled();
    });

    it("foydalanuvchi hech qanday nuqtaga biriktirilmagan bo'lsa ForbiddenError otadi", async () => {
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue(null);

      await expect(service.create(auth, dto)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("sklad topilmasa NotFoundError otadi", async () => {
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");
      salePointsRepository.findById.mockResolvedValue({ id: "sp1", priceTypeId: "pt1" });
      warehousesRepository.findById.mockResolvedValue(null);

      await expect(service.create(auth, dto)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("mahsulot uchun narx belgilanmagan bo'lsa NotFoundError otadi", async () => {
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");
      salePointsRepository.findById.mockResolvedValue({
        id: "sp1",
        priceTypeId: "pt1",
        counterpartyId: "cp1",
      });
      warehousesRepository.findById.mockResolvedValue({ id: "w1" });
      counterpartiesRepository.findById.mockResolvedValue({ paymentTermDays: 15 });
      productsRepository.findById.mockResolvedValue({
        id: "p1",
        baseUnitId: "u-dona",
        nameUz: "Non",
      });
      productPricesRepository.listCurrentByProduct.mockResolvedValue([]);

      await expect(service.create(auth, dto)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("to'g'ri holatda zakaz yaratadi, narxni snapshot qiladi, status-tarixga yozadi", async () => {
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");
      salePointsRepository.findById.mockResolvedValue({
        id: "sp1",
        priceTypeId: "pt1",
        counterpartyId: "cp1",
      });
      warehousesRepository.findById.mockResolvedValue({ id: "w1" });
      counterpartiesRepository.findById.mockResolvedValue({ paymentTermDays: 15 });
      productsRepository.findById.mockResolvedValue({
        id: "p1",
        baseUnitId: "u-dona",
        nameUz: "Non",
      });
      productPricesRepository.listCurrentByProduct.mockResolvedValue([
        { priceTypeId: "pt1", price: 5000 },
      ]);
      const createdOrder = { id: "o1", number: "ZAK-2026-00001" };
      ordersRepository.create.mockResolvedValue(createdOrder);

      const result = await service.create(auth, dto);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          companyId: "c1",
          number: "ZAK-2026-00001",
          salePointId: "sp1",
          warehouseId: "w1",
          status: "new",
          paymentTermDays: 15,
          subtotal: 10000,
          total: 10000,
          idempotencyKey: "key-1",
          items: {
            create: [
              expect.objectContaining({
                productId: "p1",
                qtyOrdered: 2,
                qtyBaseOrdered: 2,
                price: 5000,
                discountPct: 0,
                total: 10000,
              }),
            ],
          },
        }),
      );
      expect(ordersRepository.addStatusHistory).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          orderId: "o1",
          fromStatus: null,
          toStatus: "new",
          byUser: "u1",
        }),
      );
      expect(result).toBe(createdOrder);
    });
  });

  describe("list", () => {
    it("orders.view ruxsati bo'lsa butun kompaniya ro'yxatini qaytaradi", async () => {
      rolesRepository.hasPermission.mockResolvedValue(true);
      ordersRepository.list.mockResolvedValue([{ id: "o1" }]);

      const result = await service.list(auth, { status: "new" });

      expect(ordersRepository.list).toHaveBeenCalledWith(fakeTx, "c1", { status: "new" });
      expect(userAssignmentsRepository.findSalePointIdForUser).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: "o1" }]);
    });

    it("ruxsat bo'lmasa faqat o'z sotuv nuqtasi zakazlarini qaytaradi", async () => {
      rolesRepository.hasPermission.mockResolvedValue(false);
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");
      ordersRepository.list.mockResolvedValue([{ id: "o1", salePointId: "sp1" }]);

      await service.list(auth, {});

      expect(ordersRepository.list).toHaveBeenCalledWith(fakeTx, "c1", { salePointId: "sp1" });
    });

    it("ruxsat yo'q va nuqtaga biriktirilmagan bo'lsa bo'sh ro'yxat qaytaradi", async () => {
      rolesRepository.hasPermission.mockResolvedValue(false);
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue(null);

      const result = await service.list(auth, {});

      expect(result).toEqual([]);
      expect(ordersRepository.list).not.toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("topilmasa NotFoundError otadi", async () => {
      ordersRepository.findById.mockResolvedValue(null);

      await expect(service.getById(auth, "o1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("orders.view ruxsati bo'lsa istalgan zakazni qaytaradi", async () => {
      ordersRepository.findById.mockResolvedValue({ id: "o1", salePointId: "sp1" });
      rolesRepository.hasPermission.mockResolvedValue(true);

      const result = await service.getById(auth, "o1");

      expect(result).toEqual({ id: "o1", salePointId: "sp1" });
    });

    it("ruxsat yo'q va boshqa nuqta zakazi bo'lsa NotFoundError otadi", async () => {
      ordersRepository.findById.mockResolvedValue({ id: "o1", salePointId: "sp-other" });
      rolesRepository.hasPermission.mockResolvedValue(false);
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");

      await expect(service.getById(auth, "o1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("ruxsat yo'q, lekin o'z nuqtasi zakazi bo'lsa qaytaradi", async () => {
      ordersRepository.findById.mockResolvedValue({ id: "o1", salePointId: "sp1" });
      rolesRepository.hasPermission.mockResolvedValue(false);
      userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");

      const result = await service.getById(auth, "o1");

      expect(result).toEqual({ id: "o1", salePointId: "sp1" });
    });
  });

  describe("confirm", () => {
    const order = {
      id: "o1",
      status: "new",
      warehouseId: "w1",
      paymentTermDays: 15,
      items: [{ productId: "p1", variantId: null, qtyBaseOrdered: 5 }],
    };

    it("topilmasa NotFoundError otadi", async () => {
      ordersRepository.findById.mockResolvedValue(null);

      await expect(service.confirm(auth, "o1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("status 'new' bo'lmasa ConflictError otadi", async () => {
      ordersRepository.findById.mockResolvedValue({ ...order, status: "confirmed" });

      await expect(service.confirm(auth, "o1")).rejects.toBeInstanceOf(ConflictError);
      expect(stockRepository.applyReservedDelta).not.toHaveBeenCalled();
    });

    it("mavjud qoldiq yetarli bo'lmasa InsufficientStockError otadi, rezerv qo'yilmaydi", async () => {
      ordersRepository.findById.mockResolvedValue(order);
      stockRepository.findOne.mockResolvedValue({ quantity: 3, reserved: 0 });

      await expect(service.confirm(auth, "o1")).rejects.toBeInstanceOf(InsufficientStockError);
      expect(stockRepository.applyReservedDelta).not.toHaveBeenCalled();
      expect(ordersRepository.update).not.toHaveBeenCalled();
    });

    it("yetarli bo'lsa rezerv qo'yadi, statusni 'confirmed'ga o'tkazadi, dueDate hisoblaydi", async () => {
      ordersRepository.findById.mockResolvedValue(order);
      stockRepository.findOne.mockResolvedValue({ quantity: 10, reserved: 0 });
      ordersRepository.update.mockResolvedValue({ ...order, status: "confirmed" });

      const result = await service.confirm(auth, "o1");

      expect(stockRepository.applyReservedDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          warehouseId: "w1",
          productId: "p1",
          variantId: null,
          reservedDelta: 5,
        }),
      );
      expect(ordersRepository.update).toHaveBeenCalledWith(
        fakeTx,
        "o1",
        expect.objectContaining({ status: "confirmed", dueDate: expect.any(Date) }),
      );
      expect(ordersRepository.addStatusHistory).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ orderId: "o1", fromStatus: "new", toStatus: "confirmed" }),
      );
      expect(result).toEqual({ ...order, status: "confirmed" });
    });
  });

  describe("cancel", () => {
    const item = { productId: "p1", variantId: null, qtyBaseOrdered: 5 };

    it("topilmasa NotFoundError otadi", async () => {
      ordersRepository.findById.mockResolvedValue(null);

      await expect(service.cancel(auth, "o1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("'shipped' holatda ConflictError otadi", async () => {
      ordersRepository.findById.mockResolvedValue({
        id: "o1",
        status: "shipped",
        warehouseId: "w1",
        items: [item],
      });

      await expect(service.cancel(auth, "o1")).rejects.toBeInstanceOf(ConflictError);
    });

    it("'new' holatda rezerv bo'shatilmaydi (hali qo'yilmagan)", async () => {
      ordersRepository.findById.mockResolvedValue({
        id: "o1",
        status: "new",
        warehouseId: "w1",
        items: [item],
      });
      ordersRepository.update.mockResolvedValue({ id: "o1", status: "cancelled" });

      await service.cancel(auth, "o1");

      expect(stockRepository.applyReservedDelta).not.toHaveBeenCalled();
      expect(ordersRepository.update).toHaveBeenCalledWith(fakeTx, "o1", { status: "cancelled" });
    });

    it("'confirmed' holatda rezervni to'liq bo'shatadi (manfiy delta)", async () => {
      ordersRepository.findById.mockResolvedValue({
        id: "o1",
        status: "confirmed",
        warehouseId: "w1",
        items: [item],
      });
      ordersRepository.update.mockResolvedValue({ id: "o1", status: "cancelled" });

      await service.cancel(auth, "o1");

      expect(stockRepository.applyReservedDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ productId: "p1", reservedDelta: -5 }),
      );
      expect(ordersRepository.addStatusHistory).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ orderId: "o1", fromStatus: "confirmed", toStatus: "cancelled" }),
      );
    });
  });

  describe("pick", () => {
    it("status 'confirmed' bo'lmasa ConflictError otadi", async () => {
      ordersRepository.findById.mockResolvedValue({ id: "o1", status: "new" });

      await expect(service.pick(auth, "o1")).rejects.toBeInstanceOf(ConflictError);
    });

    it("'confirmed'dan 'picking'ga o'tkazadi", async () => {
      ordersRepository.findById.mockResolvedValue({ id: "o1", status: "confirmed" });
      ordersRepository.update.mockResolvedValue({ id: "o1", status: "picking" });

      const result = await service.pick(auth, "o1");

      expect(ordersRepository.update).toHaveBeenCalledWith(fakeTx, "o1", { status: "picking" });
      expect(ordersRepository.addStatusHistory).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ fromStatus: "confirmed", toStatus: "picking" }),
      );
      expect(result).toEqual({ id: "o1", status: "picking" });
    });
  });

  describe("ship", () => {
    const order = {
      id: "o1",
      status: "picking",
      warehouseId: "w1",
      salePointId: "sp1",
      currency: "UZS",
      items: [
        {
          id: "oi1",
          productId: "p1",
          variantId: null,
          unitId: "u-dona",
          qtyOrdered: 10,
          qtyBaseOrdered: 10,
          price: 5000,
        },
      ],
    };

    it("status 'picking' bo'lmasa ConflictError otadi", async () => {
      ordersRepository.findById.mockResolvedValue({ ...order, status: "confirmed" });

      await expect(service.ship(auth, "o1", {})).rejects.toBeInstanceOf(ConflictError);
    });

    it("to'liq jo'natishda bitta 'issue' hujjat yaratadi, stock/reserved kamaytiradi", async () => {
      ordersRepository.findById.mockResolvedValue(order);
      salePointsRepository.findById.mockResolvedValue({ id: "sp1", counterpartyId: "cp1" });
      warehouseDocsRepository.create.mockResolvedValue({ id: "doc1" });
      warehouseDocsRepository.addItem.mockResolvedValue({ id: "di1" });
      warehouseDocsRepository.findById.mockResolvedValue({ id: "doc1", status: "confirmed" });

      const result = await service.ship(auth, "o1", {});

      expect(warehouseDocsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          type: "issue",
          number: expect.stringMatching(/^CHIQ-\d{4}-00001$/),
          warehouseId: "w1",
          counterpartyId: "cp1",
          status: "confirmed",
        }),
      );
      expect(warehouseDocsRepository.addItem).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ docId: "doc1", productId: "p1", qty: 10, qtyBase: 10 }),
      );
      expect(stockRepository.applyDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ productId: "p1", qtyDelta: -10 }),
      );
      expect(stockRepository.applyReservedDelta).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ productId: "p1", reservedDelta: -10 }),
      );
      expect(stockMovementsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ docType: "issue", docId: "doc1", qty: -10 }),
      );
      expect(ordersRepository.updateItem).toHaveBeenCalledWith(fakeTx, "oi1", {
        qtyShipped: 10,
        qtyBaseShipped: 10,
      });
      expect(ordersRepository.update).toHaveBeenCalledWith(fakeTx, "o1", { status: "shipped" });
      expect(ordersRepository.addStatusHistory).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ fromStatus: "picking", toStatus: "shipped" }),
      );
      expect(result).toEqual({ id: "doc1", status: "confirmed" });
    });

    it("qisman miqdorda proportsional qtyBase hisoblaydi (backorder qoladi)", async () => {
      ordersRepository.findById.mockResolvedValue(order);
      salePointsRepository.findById.mockResolvedValue({ id: "sp1", counterpartyId: "cp1" });
      warehouseDocsRepository.create.mockResolvedValue({ id: "doc1" });
      warehouseDocsRepository.addItem.mockResolvedValue({ id: "di1" });
      warehouseDocsRepository.findById.mockResolvedValue({ id: "doc1" });

      await service.ship(auth, "o1", { items: [{ orderItemId: "oi1", qty: 4 }] });

      expect(warehouseDocsRepository.addItem).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ qty: 4, qtyBase: 4 }),
      );
      expect(ordersRepository.updateItem).toHaveBeenCalledWith(fakeTx, "oi1", {
        qtyShipped: 4,
        qtyBaseShipped: 4,
      });
    });

    it("buyurtmadan ko'p miqdor berilsa ValidationError otadi", async () => {
      ordersRepository.findById.mockResolvedValue(order);
      salePointsRepository.findById.mockResolvedValue({ id: "sp1", counterpartyId: "cp1" });
      warehouseDocsRepository.create.mockResolvedValue({ id: "doc1" });

      await expect(
        service.ship(auth, "o1", { items: [{ orderItemId: "oi1", qty: 99 }] }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });
});
