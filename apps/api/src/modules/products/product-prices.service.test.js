import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { ProductPricesService } = await import("./product-prices.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("ProductPricesService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let productPricesRepository;
  let productsRepository;
  let priceTypesRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    productPricesRepository = {
      create: vi.fn(),
      listByProduct: vi.fn(),
      listCurrentByProduct: vi.fn(),
    };
    productsRepository = { findById: vi.fn() };
    priceTypesRepository = { findById: vi.fn() };
    service = new ProductPricesService({
      productPricesRepository,
      productsRepository,
      priceTypesRepository,
    });
  });

  describe("addPrice", () => {
    it("mahsulot topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(
        service.addPrice(auth, "p1", { priceTypeId: "pt1", price: 1000, currency: "UZS" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("narx turi topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      priceTypesRepository.findById.mockResolvedValue(null);

      await expect(
        service.addPrice(auth, "p1", { priceTypeId: "pt1", price: 1000, currency: "UZS" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("validFrom berilmasa hozirgi vaqt bilan yaratadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      priceTypesRepository.findById.mockResolvedValue({ id: "pt1" });
      productPricesRepository.create.mockResolvedValue({ id: "pp1" });

      await service.addPrice(auth, "p1", { priceTypeId: "pt1", price: 1000, currency: "UZS" });

      expect(productPricesRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({
          productId: "p1",
          priceTypeId: "pt1",
          price: 1000,
          currency: "UZS",
          createdBy: "u1",
          validFrom: expect.any(Date),
        }),
      );
    });

    it("validFrom berilsa o'shani ishlatadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      priceTypesRepository.findById.mockResolvedValue({ id: "pt1" });
      productPricesRepository.create.mockResolvedValue({ id: "pp1" });
      const validFrom = new Date("2026-01-01T00:00:00Z");

      await service.addPrice(auth, "p1", {
        priceTypeId: "pt1",
        price: 1000,
        currency: "UZS",
        validFrom,
      });

      expect(productPricesRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ validFrom }),
      );
    });
  });

  describe("listPrices", () => {
    it("mahsulot topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.listPrices(auth, "p1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("repository.listByProduct'ni chaqiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productPricesRepository.listByProduct.mockResolvedValue([]);

      await service.listPrices(auth, "p1");

      expect(productPricesRepository.listByProduct).toHaveBeenCalledWith(fakeTx, "p1");
    });
  });

  describe("currentPrices", () => {
    it("mahsulot topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.currentPrices(auth, "p1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("repository.listCurrentByProduct'ni hozirgi vaqt bilan chaqiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productPricesRepository.listCurrentByProduct.mockResolvedValue([]);

      await service.currentPrices(auth, "p1");

      expect(productPricesRepository.listCurrentByProduct).toHaveBeenCalledWith(
        fakeTx,
        "p1",
        expect.any(Date),
      );
    });
  });
});
