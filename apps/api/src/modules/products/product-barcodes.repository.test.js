import { describe, it, expect, vi } from "vitest";
import { ProductBarcodesRepository } from "./product-barcodes.repository.js";

describe("ProductBarcodesRepository", () => {
  it("create — tx.productBarcode.create'ni data bilan chaqiradi", async () => {
    const data = { id: "b1", companyId: "c1", productId: "p1", barcode: "4780000000017" };
    const tx = { productBarcode: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductBarcodesRepository();

    const result = await repo.create(tx, data);

    expect(tx.productBarcode.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.productBarcode.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "b1" };
    const tx = { productBarcode: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductBarcodesRepository();

    const result = await repo.findById(tx, "b1");

    expect(tx.productBarcode.findUnique).toHaveBeenCalledWith({ where: { id: "b1" } });
    expect(result).toBe(data);
  });

  it("findByBarcode — tx.productBarcode.findFirst'ni barcode bilan chaqiradi", async () => {
    const data = { id: "b1", barcode: "4780000000017" };
    const tx = { productBarcode: { findFirst: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductBarcodesRepository();

    const result = await repo.findByBarcode(tx, "4780000000017");

    expect(tx.productBarcode.findFirst).toHaveBeenCalledWith({
      where: { barcode: "4780000000017" },
    });
    expect(result).toBe(data);
  });

  it("list — mahsulot bo'yicha qaytaradi", async () => {
    const tx = { productBarcode: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ProductBarcodesRepository();

    await repo.list(tx, "p1");

    expect(tx.productBarcode.findMany).toHaveBeenCalledWith({ where: { productId: "p1" } });
  });

  it("delete — tx.productBarcode.delete'ni id bilan chaqiradi", async () => {
    const tx = { productBarcode: { delete: vi.fn().mockResolvedValue({}) } };
    const repo = new ProductBarcodesRepository();

    await repo.delete(tx, "b1");

    expect(tx.productBarcode.delete).toHaveBeenCalledWith({ where: { id: "b1" } });
  });
});
