import { describe, it, expect, vi } from "vitest";
import { ProductImagesRepository } from "./product-images.repository.js";

describe("ProductImagesRepository", () => {
  it("create — tx.productImage.create'ni data bilan chaqiradi", async () => {
    const data = { id: "img1", productId: "p1", path: "products/p1/img1.jpg" };
    const tx = { productImage: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductImagesRepository();

    const result = await repo.create(tx, data);

    expect(tx.productImage.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.productImage.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "img1" };
    const tx = { productImage: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new ProductImagesRepository();

    const result = await repo.findById(tx, "img1");

    expect(tx.productImage.findUnique).toHaveBeenCalledWith({ where: { id: "img1" } });
    expect(result).toBe(data);
  });

  it("list — productId bo'yicha, isMain+sort tartibida", async () => {
    const tx = { productImage: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ProductImagesRepository();

    await repo.list(tx, "p1");

    expect(tx.productImage.findMany).toHaveBeenCalledWith({
      where: { productId: "p1" },
      orderBy: [{ isMain: "desc" }, { sort: "asc" }],
    });
  });

  it("listByProducts — bo'sh ro'yxatda so'rov qilmasdan [] qaytaradi", async () => {
    const tx = { productImage: { findMany: vi.fn() } };
    const repo = new ProductImagesRepository();

    const result = await repo.listByProducts(tx, []);

    expect(tx.productImage.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("listByProducts — productId:{in:[...]}, productId+isMain+sort tartibida", async () => {
    const tx = { productImage: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new ProductImagesRepository();

    await repo.listByProducts(tx, ["p1", "p2"]);

    expect(tx.productImage.findMany).toHaveBeenCalledWith({
      where: { productId: { in: ["p1", "p2"] } },
      orderBy: [{ productId: "asc" }, { isMain: "desc" }, { sort: "asc" }],
    });
  });

  it("update — tx.productImage.update'ni id va data bilan chaqiradi", async () => {
    const data = { isMain: true };
    const updated = { id: "img1", ...data };
    const tx = { productImage: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new ProductImagesRepository();

    const result = await repo.update(tx, "img1", data);

    expect(tx.productImage.update).toHaveBeenCalledWith({ where: { id: "img1" }, data });
    expect(result).toBe(updated);
  });

  it("delete — tx.productImage.delete'ni id bilan chaqiradi", async () => {
    const tx = { productImage: { delete: vi.fn().mockResolvedValue({}) } };
    const repo = new ProductImagesRepository();

    await repo.delete(tx, "img1");

    expect(tx.productImage.delete).toHaveBeenCalledWith({ where: { id: "img1" } });
  });

  it("unsetMain — excludeId berilsa shu ID bundan mustasno", async () => {
    const tx = { productImage: { updateMany: vi.fn().mockResolvedValue({}) } };
    const repo = new ProductImagesRepository();

    await repo.unsetMain(tx, "p1", "img1");

    expect(tx.productImage.updateMany).toHaveBeenCalledWith({
      where: { productId: "p1", isMain: true, id: { not: "img1" } },
      data: { isMain: false },
    });
  });
});
