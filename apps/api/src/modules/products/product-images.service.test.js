import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const putObject = vi.fn();
const removeObject = vi.fn();
const presignedGetObject = vi.fn();
vi.mock("../../lib/minio.js", () => ({
  minioClient: {
    putObject: (...args) => putObject(...args),
    removeObject: (...args) => removeObject(...args),
    presignedGetObject: (...args) => presignedGetObject(...args),
  },
  MINIO_BUCKET: "murcha-test",
}));

const queueAdd = vi.fn();
vi.mock("../../lib/queue.js", () => ({
  thumbnailQueue: { add: (...args) => queueAdd(...args) },
}));

const { ProductImagesService } = await import("./product-images.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("ProductImagesService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  const file = { buffer: Buffer.from("fake-image"), size: 10, mimetype: "image/jpeg" };
  let productImagesRepository;
  let productsRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    putObject.mockReset().mockResolvedValue(undefined);
    removeObject.mockReset().mockResolvedValue(undefined);
    queueAdd.mockReset().mockResolvedValue(undefined);
    productImagesRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      unsetMain: vi.fn(),
    };
    productsRepository = { findById: vi.fn() };
    service = new ProductImagesService({ productImagesRepository, productsRepository });
  });

  describe("uploadImage", () => {
    it("mahsulot topilmasa NotFoundError otadi, MinIO'ga yozmaydi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.uploadImage(auth, "p1", file)).rejects.toBeInstanceOf(NotFoundError);
      expect(putObject).not.toHaveBeenCalled();
    });

    it("birinchi rasm bo'lsa isMain:true va sort:0 bilan yaratadi, navbatga qo'shadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productImagesRepository.list.mockResolvedValue([]);
      productImagesRepository.create.mockResolvedValue({ id: "img1", isMain: true, sort: 0 });

      const result = await service.uploadImage(auth, "p1", file);

      expect(putObject).toHaveBeenCalledWith(
        "murcha-test",
        expect.stringMatching(/^products\/p1\/.+\.jpg$/),
        file.buffer,
        file.size,
        { "Content-Type": "image/jpeg" },
      );
      expect(productImagesRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ productId: "p1", isMain: true, sort: 0 }),
      );
      expect(queueAdd).toHaveBeenCalledWith("generate", {
        imageId: "img1",
        path: expect.any(String),
      });
      expect(result).toEqual({ id: "img1", isMain: true, sort: 0 });
    });

    it("ikkinchi rasm bo'lsa isMain:false va sort:1 bilan yaratadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productImagesRepository.list.mockResolvedValue([{ id: "img1" }]);
      productImagesRepository.create.mockResolvedValue({ id: "img2", isMain: false, sort: 1 });

      await service.uploadImage(auth, "p1", file);

      expect(productImagesRepository.create).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ isMain: false, sort: 1 }),
      );
    });
  });

  describe("listImages", () => {
    it("mahsulot topilmasa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.listImages(auth, "p1")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("setMain", () => {
    it("boshqa mahsulotga tegishli bo'lsa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productImagesRepository.findById.mockResolvedValue({ id: "img1", productId: "p2" });

      await expect(service.setMain(auth, "p1", "img1")).rejects.toBeInstanceOf(NotFoundError);
      expect(productImagesRepository.unsetMain).not.toHaveBeenCalled();
    });

    it("to'g'ri bo'lsa avval unsetMain, keyin update chaqiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productImagesRepository.findById.mockResolvedValue({ id: "img1", productId: "p1" });
      productImagesRepository.update.mockResolvedValue({ id: "img1", isMain: true });

      await service.setMain(auth, "p1", "img1");

      expect(productImagesRepository.unsetMain).toHaveBeenCalledWith(fakeTx, "p1", "img1");
      expect(productImagesRepository.update).toHaveBeenCalledWith(fakeTx, "img1", {
        isMain: true,
      });
    });
  });

  describe("deleteImage", () => {
    it("boshqa mahsulotga tegishli bo'lsa NotFoundError otadi, MinIO'dan o'chirmaydi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productImagesRepository.findById.mockResolvedValue({ id: "img1", productId: "p2" });

      await expect(service.deleteImage(auth, "p1", "img1")).rejects.toBeInstanceOf(NotFoundError);
      expect(removeObject).not.toHaveBeenCalled();
    });

    it("thumbPath bo'lsa ikkalasini ham MinIO'dan o'chiradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productImagesRepository.findById.mockResolvedValue({
        id: "img1",
        productId: "p1",
        path: "products/p1/img1.jpg",
        thumbPath: "products/p1/img1-thumb.jpg",
      });

      await service.deleteImage(auth, "p1", "img1");

      expect(removeObject).toHaveBeenCalledWith("murcha-test", "products/p1/img1.jpg");
      expect(removeObject).toHaveBeenCalledWith("murcha-test", "products/p1/img1-thumb.jpg");
      expect(productImagesRepository.delete).toHaveBeenCalledWith(fakeTx, "img1");
    });

    it("thumbPath yo'q bo'lsa faqat original o'chiriladi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productImagesRepository.findById.mockResolvedValue({
        id: "img1",
        productId: "p1",
        path: "products/p1/img1.jpg",
        thumbPath: null,
      });

      await service.deleteImage(auth, "p1", "img1");

      expect(removeObject).toHaveBeenCalledTimes(1);
    });
  });

  describe("getUrl", () => {
    it("boshqa mahsulotga tegishli bo'lsa NotFoundError otadi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productImagesRepository.findById.mockResolvedValue({ id: "img1", productId: "p2" });

      await expect(service.getUrl(auth, "p1", "img1")).rejects.toBeInstanceOf(NotFoundError);
      expect(presignedGetObject).not.toHaveBeenCalled();
    });

    it("to'g'ri bo'lsa imzolangan URL qaytaradi", async () => {
      productsRepository.findById.mockResolvedValue({ id: "p1" });
      productImagesRepository.findById.mockResolvedValue({
        id: "img1",
        productId: "p1",
        path: "products/p1/img1.jpg",
      });
      presignedGetObject.mockResolvedValue("https://minio.example/signed-url");

      const result = await service.getUrl(auth, "p1", "img1");

      expect(presignedGetObject).toHaveBeenCalledWith(
        "murcha-test",
        "products/p1/img1.jpg",
        15 * 60,
      );
      expect(result).toEqual({ url: "https://minio.example/signed-url" });
    });
  });
});
