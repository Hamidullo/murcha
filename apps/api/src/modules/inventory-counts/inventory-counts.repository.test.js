import { describe, it, expect, vi } from "vitest";
import { InventoryCountsRepository } from "./inventory-counts.repository.js";

describe("InventoryCountsRepository", () => {
  it("create — tx.inventoryCount.create'ni data bilan chaqiradi", async () => {
    const data = { id: "ic1", companyId: "c1" };
    const tx = { inventoryCount: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new InventoryCountsRepository();

    const result = await repo.create(tx, data);

    expect(tx.inventoryCount.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — items bilan birga qaytaradi", async () => {
    const data = { id: "ic1", items: [] };
    const tx = { inventoryCount: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new InventoryCountsRepository();

    const result = await repo.findById(tx, "ic1");

    expect(tx.inventoryCount.findUnique).toHaveBeenCalledWith({
      where: { id: "ic1" },
      include: { items: true },
    });
    expect(result).toBe(data);
  });

  it("list — filtrlar berilsa where'ga qo'shadi", async () => {
    const tx = { inventoryCount: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new InventoryCountsRepository();

    await repo.list(tx, "c1", { warehouseId: "w1", status: "in_progress" });

    expect(tx.inventoryCount.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1", warehouseId: "w1", status: "in_progress" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("createItem — tx.inventoryCountItem.create'ni data bilan chaqiradi", async () => {
    const data = { id: "i1", countId: "ic1" };
    const tx = { inventoryCountItem: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new InventoryCountsRepository();

    const result = await repo.createItem(tx, data);

    expect(tx.inventoryCountItem.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("updateItem — tx.inventoryCountItem.update'ni id va data bilan chaqiradi", async () => {
    const updated = { id: "i1", countedQty: 5 };
    const tx = { inventoryCountItem: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new InventoryCountsRepository();

    const result = await repo.updateItem(tx, "i1", { countedQty: 5 });

    expect(tx.inventoryCountItem.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { countedQty: 5 },
    });
    expect(result).toBe(updated);
  });
});
