import { describe, it, expect, vi } from "vitest";
import { computeQtyBase } from "./qty-base.js";
import { ValidationError } from "./errors.js";

describe("computeQtyBase", () => {
  const tx = {};

  it("birlik asosiy birlik bo'lsa qty'ni o'zgarishsiz qaytaradi", async () => {
    const productUnitsRepository = { findByProductAndUnit: vi.fn() };
    const product = { id: "p1", baseUnitId: "u-dona" };

    const result = await computeQtyBase(tx, productUnitsRepository, product, "u-dona", 5);

    expect(result).toBe(5);
    expect(productUnitsRepository.findByProductAndUnit).not.toHaveBeenCalled();
  });

  it("boshqa birlik bo'lsa factor'ga ko'paytiradi", async () => {
    const productUnitsRepository = {
      findByProductAndUnit: vi.fn().mockResolvedValue({ factor: 20 }),
    };
    const product = { id: "p1", baseUnitId: "u-dona" };

    const result = await computeQtyBase(tx, productUnitsRepository, product, "u-blok", 3);

    expect(productUnitsRepository.findByProductAndUnit).toHaveBeenCalledWith(tx, "p1", "u-blok");
    expect(result).toBe(60);
  });

  it("mahsulotga ulanmagan birlik bo'lsa ValidationError otadi", async () => {
    const productUnitsRepository = { findByProductAndUnit: vi.fn().mockResolvedValue(null) };
    const product = { id: "p1", baseUnitId: "u-dona" };

    await expect(
      computeQtyBase(tx, productUnitsRepository, product, "u-metr", 3),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
