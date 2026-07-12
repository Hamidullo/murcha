import { describe, it, expect, vi } from "vitest";
import { ProductPricesRepository } from "./product-prices.repository.js";

describe("ProductPricesRepository", () => {
  it("create — tx.productPrice.create'ni data bilan chaqiradi", async () => {
    const data = { id: "pp1", productId: "p1", priceTypeId: "pt1", price: 1000, currency: "UZS" };
    const tx = { productPrice: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductPricesRepository();

    const result = await repo.create(tx, data);

    expect(tx.productPrice.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("listByProduct — productId bo'yicha, priceTypeId+validFrom tartibida", async () => {
    const tx = { productPrice: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ProductPricesRepository();

    await repo.listByProduct(tx, "p1");

    expect(tx.productPrice.findMany).toHaveBeenCalledWith({
      where: { productId: "p1" },
      orderBy: [{ priceTypeId: "asc" }, { validFrom: "desc" }],
    });
  });

  it("listCurrentByProduct — validFrom<=asOf, distinct priceTypeId bilan", async () => {
    const tx = { productPrice: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ProductPricesRepository();
    const asOf = new Date("2026-01-01T00:00:00Z");

    await repo.listCurrentByProduct(tx, "p1", asOf);

    expect(tx.productPrice.findMany).toHaveBeenCalledWith({
      where: { productId: "p1", validFrom: { lte: asOf } },
      orderBy: [{ priceTypeId: "asc" }, { validFrom: "desc" }],
      distinct: ["priceTypeId"],
    });
  });
});
