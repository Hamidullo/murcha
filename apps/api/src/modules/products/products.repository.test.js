import { describe, it, expect, vi } from "vitest";
import { ProductsRepository } from "./products.repository.js";

describe("ProductsRepository", () => {
  it("create — tx.product.create'ni data bilan chaqiradi", async () => {
    const data = { id: "p1", companyId: "c1", sku: "SKU-1", nameUz: "Non" };
    const tx = { product: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductsRepository();

    const result = await repo.create(tx, data);

    expect(tx.product.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.product.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "p1", nameUz: "Non" };
    const tx = { product: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductsRepository();

    const result = await repo.findById(tx, "p1");

    expect(tx.product.findUnique).toHaveBeenCalledWith({ where: { id: "p1" } });
    expect(result).toBe(data);
  });

  it("findBySku — tx.product.findFirst'ni sku bilan chaqiradi", async () => {
    const data = { id: "p1", sku: "SKU-1" };
    const tx = { product: { findFirst: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductsRepository();

    const result = await repo.findBySku(tx, "SKU-1");

    expect(tx.product.findFirst).toHaveBeenCalledWith({ where: { sku: "SKU-1" } });
    expect(result).toBe(data);
  });

  it("list — tx.product.findMany'ni companyId va deletedAt:null bilan chaqiradi", async () => {
    const tx = { product: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ProductsRepository();

    await repo.list(tx, "c1");

    expect(tx.product.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1", deletedAt: null },
      include: {
        category: { select: { id: true, nameUz: true } },
        baseUnit: { select: { id: true, short: true } },
      },
      orderBy: { nameUz: "asc" },
    });
  });

  it("list — search berilsa nameUz bo'yicha case-insensitive filtr qo'shadi", async () => {
    const tx = { product: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ProductsRepository();

    await repo.list(tx, "c1", { search: "non" });

    expect(tx.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nameUz: { contains: "non", mode: "insensitive" },
        }),
      }),
    );
  });

  it("list — categoryId berilsa filtr qo'shadi", async () => {
    const tx = { product: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ProductsRepository();

    await repo.list(tx, "c1", { categoryId: "cat1" });

    expect(tx.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: "cat1" }),
      }),
    );
  });

  it("update — tx.product.update'ni id va data bilan chaqiradi", async () => {
    const data = { nameUz: "Yangi nom" };
    const updated = { id: "p1", ...data };
    const tx = { product: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new ProductsRepository();

    const result = await repo.update(tx, "p1", data);

    expect(tx.product.update).toHaveBeenCalledWith({ where: { id: "p1" }, data });
    expect(result).toBe(updated);
  });
});
