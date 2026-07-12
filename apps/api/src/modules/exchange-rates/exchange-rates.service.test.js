import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { ExchangeRatesService } = await import("./exchange-rates.service.js");
const { NotFoundError } = await import("../../lib/errors.js");

describe("ExchangeRatesService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let exchangeRatesRepository;
  let companiesRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    exchangeRatesRepository = { findLatest: vi.fn(), upsert: vi.fn() };
    companiesRepository = { findById: vi.fn() };
    service = new ExchangeRatesService({ exchangeRatesRepository, companiesRepository });
  });

  describe("getCurrentRate", () => {
    it("kompaniya kursi bo'lsa uni qaytaradi (company)", async () => {
      exchangeRatesRepository.findLatest.mockResolvedValueOnce({
        rate: 12800,
        rateDate: new Date("2026-07-12"),
      });

      const result = await service.getCurrentRate(auth, "USD");

      expect(result).toEqual({
        currency: "USD",
        rate: 12800,
        rateDate: new Date("2026-07-12"),
        source: "company",
      });
      expect(companiesRepository.findById).not.toHaveBeenCalled();
    });

    it("kompaniya kursi bo'lmasa va rejim manual bo'lsa NotFoundError otadi", async () => {
      exchangeRatesRepository.findLatest.mockResolvedValueOnce(null);
      companiesRepository.findById.mockResolvedValue({ settings: { exchangeRateMode: "manual" } });

      await expect(service.getCurrentRate(auth, "USD")).rejects.toBeInstanceOf(NotFoundError);
      expect(exchangeRatesRepository.findLatest).toHaveBeenCalledTimes(1);
    });

    it("kompaniya kursi bo'lmasa va rejim cbu bo'lsa rasmiy kursga tushadi", async () => {
      exchangeRatesRepository.findLatest
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ rate: 12750, rateDate: new Date("2026-07-11") });
      companiesRepository.findById.mockResolvedValue({ settings: {} });

      const result = await service.getCurrentRate(auth, "USD");

      expect(result).toEqual({
        currency: "USD",
        rate: 12750,
        rateDate: new Date("2026-07-11"),
        source: "cbu",
      });
      expect(exchangeRatesRepository.findLatest).toHaveBeenNthCalledWith(
        2,
        fakeTx,
        null,
        "USD",
        expect.any(Date),
      );
    });

    it("cbu rejimda hech qanday kurs topilmasa NotFoundError otadi", async () => {
      exchangeRatesRepository.findLatest.mockResolvedValue(null);
      companiesRepository.findById.mockResolvedValue({ settings: {} });

      await expect(service.getCurrentRate(auth, "USD")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("setRate", () => {
    it("repository.upsert'ni companyId+dto bilan chaqiradi", async () => {
      exchangeRatesRepository.upsert.mockResolvedValue({ id: "e1" });

      await service.setRate(auth, { currency: "USD", rate: 12800 });

      expect(exchangeRatesRepository.upsert).toHaveBeenCalledWith(
        fakeTx,
        expect.objectContaining({ companyId: "c1", currency: "USD", rate: 12800 }),
      );
    });
  });
});
