import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withoutTenant = vi.fn((callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withoutTenant }));

const presignedGetObject = vi.fn().mockResolvedValue("https://minio/signed-url");
vi.mock("../../lib/minio.js", () => ({
  minioClient: { presignedGetObject: (...args) => presignedGetObject(...args) },
  MINIO_BUCKET: "murcha-test",
}));

const domainEvents = { emit: vi.fn() };
vi.mock("../../lib/events.js", () => ({ domainEvents }));

const { ShowcaseService } = await import("./showcase.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("ShowcaseService", () => {
  let companiesRepository;
  let productsRepository;
  let productPricesRepository;
  let productImagesRepository;
  let priceTypesRepository;
  let showcaseRepository;
  let service;

  beforeEach(() => {
    withoutTenant.mockClear();
    presignedGetObject.mockClear();
    domainEvents.emit.mockClear();
    companiesRepository = { findBySlug: vi.fn() };
    productsRepository = { list: vi.fn() };
    productPricesRepository = { listCurrentByProducts: vi.fn() };
    productImagesRepository = { listByProducts: vi.fn() };
    priceTypesRepository = { list: vi.fn() };
    showcaseRepository = { createLead: vi.fn() };
    service = new ShowcaseService({
      companiesRepository,
      productsRepository,
      productPricesRepository,
      productImagesRepository,
      priceTypesRepository,
      showcaseRepository,
    });
  });

  describe("getShowcase", () => {
    it("kompaniya topilmasa NotFoundError otadi", async () => {
      companiesRepository.findBySlug.mockResolvedValue(null);

      await expect(service.getShowcase("noexist")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("vitrina o'chirilgan bo'lsa NotFoundError otadi", async () => {
      companiesRepository.findBySlug.mockResolvedValue({
        id: "c1",
        showcaseSettings: { enabled: false },
      });

      await expect(service.getShowcase("slug1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("faqat active mahsulot va narx belgilangan qatorlarni qaytaradi", async () => {
      companiesRepository.findBySlug.mockResolvedValue({
        id: "c1",
        name: "Test Sklad",
        slug: "slug1",
        brandColor: "#f59e0b",
        logoPath: null,
        showcaseSettings: { enabled: true, priceTypeId: "pt1" },
      });
      priceTypesRepository.list.mockResolvedValue([{ id: "pt1", isDefault: true }]);
      productsRepository.list.mockResolvedValue([
        { id: "p1", nameUz: "Non", nameRu: null, status: "active" },
        { id: "p2", nameUz: "Arxiv", nameRu: null, status: "archived" },
        { id: "p3", nameUz: "Narxsiz", nameRu: null, status: "active" },
      ]);
      productPricesRepository.listCurrentByProducts.mockResolvedValue([
        { productId: "p1", priceTypeId: "pt1", price: 5000, currency: "UZS" },
      ]);
      productImagesRepository.listByProducts.mockResolvedValue([]);

      const result = await service.getShowcase("slug1");

      expect(result.catalog).toEqual([
        { id: "p1", nameUz: "Non", nameRu: null, price: 5000, currency: "UZS", imageUrl: null },
      ]);
      expect(result.company).toMatchObject({ id: "c1", name: "Test Sklad", slug: "slug1" });
      // faqat active mahsulotlar id'lari bilan batch chaqiriladi (p2 tashlab ketiladi)
      expect(productPricesRepository.listCurrentByProducts).toHaveBeenCalledWith(
        fakeTx,
        ["p1", "p3"],
        expect.any(Date),
      );
    });

    it("priceTypeId sozlanmagan bo'lsa isDefault narx turini ishlatadi", async () => {
      companiesRepository.findBySlug.mockResolvedValue({
        id: "c1",
        name: "Test",
        slug: "slug1",
        brandColor: null,
        logoPath: null,
        showcaseSettings: { enabled: true },
      });
      priceTypesRepository.list.mockResolvedValue([{ id: "pt-default", isDefault: true }]);
      productsRepository.list.mockResolvedValue([
        { id: "p1", nameUz: "Non", nameRu: null, status: "active" },
      ]);
      productPricesRepository.listCurrentByProducts.mockResolvedValue([
        { productId: "p1", priceTypeId: "pt-default", price: 3000, currency: "UZS" },
      ]);
      productImagesRepository.listByProducts.mockResolvedValue([]);

      const result = await service.getShowcase("slug1");

      expect(result.catalog).toHaveLength(1);
    });

    it("mahsulotning birinchi rasmini (isMain) imageUrl sifatida qaytaradi", async () => {
      companiesRepository.findBySlug.mockResolvedValue({
        id: "c1",
        name: "Test",
        slug: "slug1",
        brandColor: null,
        logoPath: null,
        showcaseSettings: { enabled: true, priceTypeId: "pt1" },
      });
      priceTypesRepository.list.mockResolvedValue([{ id: "pt1", isDefault: true }]);
      productsRepository.list.mockResolvedValue([
        { id: "p1", nameUz: "Non", nameRu: null, status: "active" },
      ]);
      productPricesRepository.listCurrentByProducts.mockResolvedValue([
        { productId: "p1", priceTypeId: "pt1", price: 5000, currency: "UZS" },
      ]);
      productImagesRepository.listByProducts.mockResolvedValue([
        { productId: "p1", isMain: true, path: "products/p1/main.jpg", thumbPath: null },
        { productId: "p1", isMain: false, path: "products/p1/second.jpg", thumbPath: null },
      ]);

      const result = await service.getShowcase("slug1");

      expect(result.catalog[0].imageUrl).toBe("https://minio/signed-url");
      expect(presignedGetObject).toHaveBeenCalledWith(
        "murcha-test",
        "products/p1/main.jpg",
        expect.any(Number),
      );
    });

    it("hech qanday narx turi bo'lmasa bo'sh katalog qaytaradi", async () => {
      companiesRepository.findBySlug.mockResolvedValue({
        id: "c1",
        name: "Test",
        slug: "slug1",
        brandColor: null,
        logoPath: null,
        showcaseSettings: { enabled: true },
      });
      priceTypesRepository.list.mockResolvedValue([]);

      const result = await service.getShowcase("slug1");

      expect(result.catalog).toEqual([]);
      expect(productsRepository.list).not.toHaveBeenCalled();
    });
  });

  describe("createLead", () => {
    it("vitrina topilmasa NotFoundError otadi va lid yaratilmaydi", async () => {
      companiesRepository.findBySlug.mockResolvedValue(null);

      await expect(
        service.createLead("noexist", { name: "Ali", phone: "+998901234567" }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(showcaseRepository.createLead).not.toHaveBeenCalled();
    });

    it("lid yaratadi va tranzaksiyadan tashqarida lead.new hodisasini chiqaradi", async () => {
      companiesRepository.findBySlug.mockResolvedValue({
        id: "c1",
        showcaseSettings: { enabled: true },
      });
      showcaseRepository.createLead.mockResolvedValue({
        id: "lead1",
        companyId: "c1",
        name: "Ali",
        phone: "+998901234567",
        status: "new",
      });

      const lead = await service.createLead("slug1", { name: "Ali", phone: "+998901234567" });

      expect(lead.id).toBe("lead1");
      expect(domainEvents.emit).toHaveBeenCalledWith("lead.new", {
        companyId: "c1",
        leadId: "lead1",
        name: "Ali",
        phone: "+998901234567",
      });
    });
  });
});
