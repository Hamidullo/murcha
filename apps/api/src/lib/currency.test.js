import { describe, it, expect, vi } from "vitest";
import { convertToUzs, resolveExchangeRate } from "./currency.js";
import { ValidationError } from "./errors.js";

describe("convertToUzs", () => {
  it("UZS bo'lsa o'zgarishsiz qaytaradi", () => {
    expect(convertToUzs(1000, "UZS", 12700)).toBe(1000);
  });

  it("USD bo'lsa kursga ko'paytiradi", () => {
    expect(convertToUzs(10, "USD", 12700)).toBe(127000);
  });
});

describe("resolveExchangeRate", () => {
  const tx = {};

  it("kompaniya kursi mavjud bo'lsa uni qaytaradi", async () => {
    const repo = { findLatest: vi.fn().mockResolvedValue({ rate: 12800 }) };

    const rate = await resolveExchangeRate(tx, repo, "c1", "USD", "cbu");

    expect(rate).toBe(12800);
    expect(repo.findLatest).toHaveBeenCalledTimes(1);
    expect(repo.findLatest).toHaveBeenCalledWith(tx, "c1", "USD", expect.any(Date));
  });

  it("manual rejimda kompaniya kursi bo'lmasa ValidationError otadi (CBU'ga qaytmaydi)", async () => {
    const repo = { findLatest: vi.fn().mockResolvedValue(null) };

    await expect(resolveExchangeRate(tx, repo, "c1", "USD", "manual")).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repo.findLatest).toHaveBeenCalledTimes(1);
  });

  it("cbu rejimda kompaniya kursi bo'lmasa rasmiy kursga tushadi", async () => {
    const repo = { findLatest: vi.fn() };
    repo.findLatest.mockResolvedValueOnce(null).mockResolvedValueOnce({ rate: 12750 });

    const rate = await resolveExchangeRate(tx, repo, "c1", "USD", "cbu");

    expect(rate).toBe(12750);
    expect(repo.findLatest).toHaveBeenNthCalledWith(2, tx, null, "USD", expect.any(Date));
  });

  it("cbu rejimda hech qanday kurs topilmasa ValidationError otadi", async () => {
    const repo = { findLatest: vi.fn().mockResolvedValue(null) };

    await expect(resolveExchangeRate(tx, repo, "c1", "USD", "cbu")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
