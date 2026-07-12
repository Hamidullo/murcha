import { describe, it, expect, vi } from "vitest";
import { ProductVariantsRepository } from "./product-variants.repository.js";

describe("ProductVariantsRepository", () => {
  it("create — tx.productVariant.create'ni data bilan chaqiradi", async () => {
    const data = { id: "v1", productId: "p1", name: "Qizil" };
    const tx = { productVariant: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductVariantsRepository();

    const result = await repo.create(tx, data);

    expect(tx.productVariant.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.productVariant.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "v1", name: "Qizil" };
    const tx = { productVariant: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductVariantsRepository();

    const result = await repo.findById(tx, "v1");

    expect(tx.productVariant.findUnique).toHaveBeenCalledWith({ where: { id: "v1" } });
    expect(result).toBe(data);
  });

  it("list — productId va deletedAt:null bilan chaqiradi", async () => {
    const tx = { productVariant: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ProductVariantsRepository();

    await repo.list(tx, "p1");

    expect(tx.productVariant.findMany).toHaveBeenCalledWith({
      where: { productId: "p1", deletedAt: null },
      orderBy: { name: "asc" },
    });
  });

  it("update — tx.productVariant.update'ni id va data bilan chaqiradi", async () => {
    const data = { name: "Yangi" };
    const updated = { id: "v1", ...data };
    const tx = { productVariant: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new ProductVariantsRepository();

    const result = await repo.update(tx, "v1", data);

    expect(tx.productVariant.update).toHaveBeenCalledWith({ where: { id: "v1" }, data });
    expect(result).toBe(updated);
  });
});
