import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const putObject = vi.fn();
const presignedGetObject = vi.fn();
vi.mock("../../lib/minio.js", () => ({
  minioClient: {
    putObject: (...args) => putObject(...args),
    presignedGetObject: (...args) => presignedGetObject(...args),
  },
  MINIO_BUCKET: "murcha",
}));

const { CompaniesService } = await import("./companies.service.js");
const { NotFoundError, ConflictError } = await import("../../lib/errors.js");

describe("CompaniesService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let companiesRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    putObject.mockClear();
    presignedGetObject.mockClear();
    companiesRepository = { findById: vi.fn(), findBySlug: vi.fn(), update: vi.fn() };
    service = new CompaniesService({ companiesRepository });
  });

  describe("getMe", () => {
    it("topilmasa NotFoundError otadi", async () => {
      companiesRepository.findById.mockResolvedValue(null);

      await expect(service.getMe(auth)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("topsa qaytaradi", async () => {
      companiesRepository.findById.mockResolvedValue({ id: "c1", name: "Murcha" });

      const result = await service.getMe(auth);

      expect(result).toEqual({ id: "c1", name: "Murcha" });
    });
  });

  describe("updateMe", () => {
    it("topilmasa NotFoundError otadi", async () => {
      companiesRepository.findById.mockResolvedValue(null);

      await expect(service.updateMe(auth, { name: "Yangi" })).rejects.toBeInstanceOf(NotFoundError);
    });

    it("settings mavjud kalitlar bilan birlashtiriladi, o'chirilmaydi", async () => {
      companiesRepository.findById.mockResolvedValue({
        id: "c1",
        settings: { creditLimitMode: "warn" },
      });
      companiesRepository.update.mockResolvedValue({ id: "c1" });

      await service.updateMe(auth, { settings: { exchangeRateMode: "manual" } });

      expect(companiesRepository.update).toHaveBeenCalledWith(fakeTx, "c1", {
        settings: { creditLimitMode: "warn", exchangeRateMode: "manual" },
      });
    });

    it("settings berilmasa faqat boshqa maydonlar yangilanadi", async () => {
      companiesRepository.findById.mockResolvedValue({
        id: "c1",
        settings: { creditLimitMode: "block" },
      });
      companiesRepository.update.mockResolvedValue({ id: "c1" });

      await service.updateMe(auth, { brandColor: "#ff0000" });

      expect(companiesRepository.update).toHaveBeenCalledWith(fakeTx, "c1", {
        brandColor: "#ff0000",
      });
    });

    it("showcaseSettings mavjud kalitlar bilan birlashtiriladi", async () => {
      companiesRepository.findById.mockResolvedValue({
        id: "c1",
        settings: {},
        showcaseSettings: { enabled: true, priceTypeId: "pt1" },
      });
      companiesRepository.update.mockResolvedValue({ id: "c1" });

      await service.updateMe(auth, { showcaseSettings: { enabled: false } });

      expect(companiesRepository.update).toHaveBeenCalledWith(fakeTx, "c1", {
        showcaseSettings: { enabled: false, priceTypeId: "pt1" },
      });
    });

    it("slug boshqa kompaniyada band bo'lsa ConflictError otadi", async () => {
      companiesRepository.findById.mockResolvedValue({ id: "c1", settings: {}, slug: null });
      companiesRepository.findBySlug.mockResolvedValue({ id: "c2" });

      await expect(service.updateMe(auth, { slug: "band-slug" })).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(companiesRepository.update).not.toHaveBeenCalled();
    });

    it("slug o'zgarmasa uniqueness tekshirilmaydi", async () => {
      companiesRepository.findById.mockResolvedValue({ id: "c1", settings: {}, slug: "eski" });
      companiesRepository.update.mockResolvedValue({ id: "c1" });

      await service.updateMe(auth, { slug: "eski" });

      expect(companiesRepository.findBySlug).not.toHaveBeenCalled();
      expect(companiesRepository.update).toHaveBeenCalledWith(fakeTx, "c1", { slug: "eski" });
    });
  });

  describe("uploadLogo", () => {
    it("kompaniya topilmasa NotFoundError otadi", async () => {
      companiesRepository.findById.mockResolvedValue(null);

      await expect(
        service.uploadLogo(auth, { buffer: Buffer.from("x"), size: 1, mimetype: "image/png" }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(putObject).not.toHaveBeenCalled();
    });

    it("MinIO'ga yuklab logoPath'ni yangilaydi", async () => {
      companiesRepository.findById.mockResolvedValue({ id: "c1" });
      companiesRepository.update.mockResolvedValue({ id: "c1", logoPath: "companies/c1/logo.png" });

      await service.uploadLogo(auth, { buffer: Buffer.from("x"), size: 1, mimetype: "image/png" });

      expect(putObject).toHaveBeenCalledWith(
        "murcha",
        "companies/c1/logo.png",
        expect.any(Buffer),
        1,
        { "Content-Type": "image/png" },
      );
      expect(companiesRepository.update).toHaveBeenCalledWith(fakeTx, "c1", {
        logoPath: "companies/c1/logo.png",
      });
    });
  });

  describe("getLogoUrl", () => {
    it("logoPath yo'q bo'lsa url:null qaytaradi", async () => {
      companiesRepository.findById.mockResolvedValue({ id: "c1", logoPath: null });

      const result = await service.getLogoUrl(auth);

      expect(result).toEqual({ url: null });
      expect(presignedGetObject).not.toHaveBeenCalled();
    });

    it("logoPath bo'lsa presigned url qaytaradi", async () => {
      companiesRepository.findById.mockResolvedValue({
        id: "c1",
        logoPath: "companies/c1/logo.png",
      });
      presignedGetObject.mockResolvedValue("https://minio/companies/c1/logo.png?sig=abc");

      const result = await service.getLogoUrl(auth);

      expect(result).toEqual({ url: "https://minio/companies/c1/logo.png?sig=abc" });
    });
  });
});
