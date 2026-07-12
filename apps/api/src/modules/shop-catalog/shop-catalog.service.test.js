import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { ShopCatalogService } = await import("./shop-catalog.service.js");
const { ForbiddenError, NotFoundError } = await import("../../lib/errors.js");

describe("ShopCatalogService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let productsRepository;
  let productPricesRepository;
  let salePointsRepository;
  let userAssignmentsRepository;
  let stockRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    productsRepository = { list: vi.fn() };
    productPricesRepository = { listCurrentByProduct: vi.fn() };
    salePointsRepository = { findById: vi.fn() };
    userAssignmentsRepository = { findSalePointIdForUser: vi.fn() };
    stockRepository = { list: vi.fn() };
    service = new ShopCatalogService({
      productsRepository,
      productPricesRepository,
      salePointsRepository,
      userAssignmentsRepository,
      stockRepository,
    });
  });

  it("foydalanuvchi nuqtaga biriktirilmagan bo'lsa ForbiddenError otadi", async () => {
    userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue(null);

    await expect(service.list(auth)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("sotuv nuqtasi topilmasa NotFoundError otadi", async () => {
    userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");
    salePointsRepository.findById.mockResolvedValue(null);

    await expect(service.list(auth)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("faqat active mahsulotlarni va narx belgilangan qatorlarni qaytaradi", async () => {
    userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");
    salePointsRepository.findById.mockResolvedValue({ id: "sp1", priceTypeId: "pt1" });
    productsRepository.list.mockResolvedValue([
      {
        id: "p1",
        sku: "SKU-1",
        nameUz: "Non",
        categoryId: null,
        baseUnitId: "u1",
        status: "active",
      },
      {
        id: "p2",
        sku: "SKU-2",
        nameUz: "Arxiv",
        categoryId: null,
        baseUnitId: "u1",
        status: "archived",
      },
      {
        id: "p3",
        sku: "SKU-3",
        nameUz: "Narxsiz",
        categoryId: null,
        baseUnitId: "u1",
        status: "active",
      },
    ]);
    productPricesRepository.listCurrentByProduct.mockImplementation((_tx, productId) => {
      if (productId === "p1") {
        return Promise.resolve([{ priceTypeId: "pt1", price: 5000, currency: "UZS" }]);
      }
      return Promise.resolve([]);
    });

    const result = await service.list(auth, {});

    expect(result).toEqual([
      {
        productId: "p1",
        sku: "SKU-1",
        nameUz: "Non",
        categoryId: null,
        baseUnitId: "u1",
        price: 5000,
        currency: "UZS",
        availableQty: null,
      },
    ]);
    expect(productPricesRepository.listCurrentByProduct).not.toHaveBeenCalledWith(
      fakeTx,
      "p2",
      expect.any(Date),
    );
  });

  it("warehouseId berilsa availableQty'ni quantity-reserved sifatida qo'shadi", async () => {
    userAssignmentsRepository.findSalePointIdForUser.mockResolvedValue("sp1");
    salePointsRepository.findById.mockResolvedValue({ id: "sp1", priceTypeId: "pt1" });
    productsRepository.list.mockResolvedValue([
      {
        id: "p1",
        sku: "SKU-1",
        nameUz: "Non",
        categoryId: null,
        baseUnitId: "u1",
        status: "active",
      },
    ]);
    productPricesRepository.listCurrentByProduct.mockResolvedValue([
      { priceTypeId: "pt1", price: 5000, currency: "UZS" },
    ]);
    stockRepository.list.mockResolvedValue([
      { productId: "p1", variantId: null, quantity: 10, reserved: 3 },
    ]);

    const result = await service.list(auth, { warehouseId: "w1" });

    expect(stockRepository.list).toHaveBeenCalledWith(fakeTx, "c1", { warehouseId: "w1" });
    expect(result[0].availableQty).toBe(7);
  });
});
