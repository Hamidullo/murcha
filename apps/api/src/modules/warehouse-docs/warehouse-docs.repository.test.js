import { describe, it, expect, vi } from "vitest";
import { WarehouseDocsRepository } from "./warehouse-docs.repository.js";

describe("WarehouseDocsRepository", () => {
  it("create — tx.warehouseDoc.create'ni data bilan chaqiradi", async () => {
    const data = { id: "d1", companyId: "c1", type: "receipt" };
    const tx = { warehouseDoc: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new WarehouseDocsRepository();

    const result = await repo.create(tx, data);

    expect(tx.warehouseDoc.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — items bilan birga qaytaradi", async () => {
    const data = { id: "d1", items: [] };
    const tx = { warehouseDoc: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new WarehouseDocsRepository();

    const result = await repo.findById(tx, "d1");

    expect(tx.warehouseDoc.findUnique).toHaveBeenCalledWith({
      where: { id: "d1" },
      include: { items: true },
    });
    expect(result).toBe(data);
  });

  it("findByIdForPrint — warehouse/toWarehouse/counterparty va item product/unit bilan include qiladi", async () => {
    const tx = { warehouseDoc: { findUnique: vi.fn().mockResolvedValue({ id: "d1" }) } };
    const repo = new WarehouseDocsRepository();

    await repo.findByIdForPrint(tx, "d1");

    expect(tx.warehouseDoc.findUnique).toHaveBeenCalledWith({
      where: { id: "d1" },
      include: {
        warehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        counterparty: { select: { name: true } },
        items: {
          include: {
            product: { select: { nameUz: true, sku: true } },
            unit: { select: { short: true } },
          },
        },
      },
    });
  });

  it("list — filtrlar berilsa where'ga qo'shadi", async () => {
    const tx = { warehouseDoc: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new WarehouseDocsRepository();

    await repo.list(tx, "c1", { type: "receipt", status: "draft", warehouseId: "w1" });

    expect(tx.warehouseDoc.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1", type: "receipt", status: "draft", warehouseId: "w1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("nextCounter — tx.docCounter.upsert'ni increment bilan chaqiradi", async () => {
    const tx = { docCounter: { upsert: vi.fn().mockResolvedValue({ counter: 3 }) } };
    const repo = new WarehouseDocsRepository();

    const result = await repo.nextCounter(tx, "c1", "receipt", 2026);

    expect(tx.docCounter.upsert).toHaveBeenCalledWith({
      where: { companyId_docType_year: { companyId: "c1", docType: "receipt", year: 2026 } },
      update: { counter: { increment: 1 } },
      create: { companyId: "c1", docType: "receipt", year: 2026, counter: 1 },
    });
    expect(result).toBe(3);
  });

  it("addItem — tx.warehouseDocItem.create'ni data bilan chaqiradi", async () => {
    const data = { id: "i1", docId: "d1" };
    const tx = { warehouseDocItem: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new WarehouseDocsRepository();

    const result = await repo.addItem(tx, data);

    expect(tx.warehouseDocItem.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("removeItem — tx.warehouseDocItem.delete'ni id bilan chaqiradi", async () => {
    const tx = { warehouseDocItem: { delete: vi.fn().mockResolvedValue({}) } };
    const repo = new WarehouseDocsRepository();

    await repo.removeItem(tx, "i1");

    expect(tx.warehouseDocItem.delete).toHaveBeenCalledWith({ where: { id: "i1" } });
  });
});
