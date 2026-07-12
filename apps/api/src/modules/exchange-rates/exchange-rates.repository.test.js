import { describe, it, expect, vi } from "vitest";
import { ExchangeRatesRepository } from "./exchange-rates.repository.js";

describe("ExchangeRatesRepository", () => {
  it("findLatest — companyId/currency/rateDate<=asOf bo'yicha eng oxirgisini oladi", async () => {
    const asOf = new Date("2026-07-12");
    const tx = { exchangeRate: { findFirst: vi.fn().mockResolvedValue({ rate: 12700 }) } };
    const repo = new ExchangeRatesRepository();

    const result = await repo.findLatest(tx, "c1", "USD", asOf);

    expect(tx.exchangeRate.findFirst).toHaveBeenCalledWith({
      where: { companyId: "c1", currency: "USD", rateDate: { lte: asOf } },
      orderBy: { rateDate: "desc" },
    });
    expect(result).toEqual({ rate: 12700 });
  });

  it("findLatest — companyId:null bilan CBU rasmiy kursini so'raydi", async () => {
    const asOf = new Date("2026-07-12");
    const tx = { exchangeRate: { findFirst: vi.fn().mockResolvedValue(null) } };
    const repo = new ExchangeRatesRepository();

    await repo.findLatest(tx, null, "USD", asOf);

    expect(tx.exchangeRate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: null }) }),
    );
  });

  it("upsert — compound unique bo'yicha create/update qiladi", async () => {
    const data = {
      id: "e1",
      companyId: "c1",
      currency: "USD",
      rate: 12750,
      rateDate: new Date("2026-07-12"),
    };
    const tx = { exchangeRate: { upsert: vi.fn().mockResolvedValue(data) } };
    const repo = new ExchangeRatesRepository();

    await repo.upsert(tx, data);

    expect(tx.exchangeRate.upsert).toHaveBeenCalledWith({
      where: {
        companyId_currency_rateDate: {
          companyId: "c1",
          currency: "USD",
          rateDate: data.rateDate,
        },
      },
      create: data,
      update: { rate: 12750 },
    });
  });
});
