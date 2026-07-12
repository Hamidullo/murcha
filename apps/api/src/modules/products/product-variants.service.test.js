import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { ProductVariantsService } = await import("./product-variants.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("ProductVariantsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let productVariantsRepository;
  let productsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    productVariantsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    };
    productsRepository = { findById: vi.fn() };
    service = new ProductVariantsService({ productVariantsRepository, productsRepository });
  });

  describe("create", () => {
    it("mahsulot topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.create(auth, "p1", { name: "Qizil" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("hammasi to'g'ri bo'lsa yaratadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productVariantsRepository.create.mockResolvedValue({ id: "v1", name: "Qizil" });

      const result = await service.create(auth, "p1", { name: "Qizil" });

      expect(productVariantsRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ productId: "p1", name: "Qizil" }),
      );
      expect(result).toEqual({ id: "v1", name: "Qizil" });
    });
  });

  describe("list", () => {
    it("mahsulot topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.list(auth, "p1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("repository.list'ni productId bilan chaqiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productVariantsRepository.list.mockResolvedValue([]);

      await service.list(auth, "p1");

      expect(productVariantsRepository.list).toHaveBeenCalledWith(fakeTx, "p1");
    });
  });

  describe("getById", () => {
    it("boshqa mahsulotga tegishli bo'lsa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productVariantsRepository.findById.mockResolvedValue({ id: "v1", productId: "p2" });

      await expect(service.getById(auth, "p1", "v1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("to'g'ri bo'lsa qaytaradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productVariantsRepository.findById.mockResolvedValue({ id: "v1", productId: "p1" });

      const result = await service.getById(auth, "p1", "v1");

      expect(result).toEqual({ id: "v1", productId: "p1" });
    });
  });

  describe("update", () => {
    it("boshqa mahsulotga tegishli bo'lsa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productVariantsRepository.findById.mockResolvedValue({ id: "v1", productId: "p2" });

      await expect(service.update(auth, "p1", "v1", { name: "Y" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(productVariantsRepository.update).not.toHaveBeenCalled();
    });

    it("to'g'ri bo'lsa repository.update'ni chaqiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productVariantsRepository.findById.mockResolvedValue({ id: "v1", productId: "p1" });
      productVariantsRepository.update.mockResolvedValue({ id: "v1", name: "Yangi" });

      const result = await service.update(auth, "p1", "v1", { name: "Yangi" });

      expect(productVariantsRepository.update).toHaveBeenCalledWith(fakeTx, "v1", {
        name: "Yangi",
      });
      expect(result).toEqual({ id: "v1", name: "Yangi" });
    });
  });

  describe("archive", () => {
    it("boshqa mahsulotga tegishli bo'lsa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productVariantsRepository.findById.mockResolvedValue({ id: "v1", productId: "p2" });

      await expect(service.archive(auth, "p1", "v1")).rejects.toBeInstanceOf(NotFoundError);
      expect(productVariantsRepository.update).not.toHaveBeenCalled();
    });

    it("to'g'ri bo'lsa deletedAt bilan yangilaydi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productVariantsRepository.findById.mockResolvedValue({ id: "v1", productId: "p1" });
      productVariantsRepository.update.mockResolvedValue({ id: "v1" });

      await service.archive(auth, "p1", "v1");

      expect(productVariantsRepository.update).toHaveBeenCalledWith(
        fakeTx,
        "v1",
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });
  });
});
