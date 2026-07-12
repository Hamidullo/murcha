import { describe, it, expect, vi } from "vitest";
import { WarehousesRepository } from "./warehouses.repository.js";

describe("WarehousesRepository", () => {
  it("create — tx.warehouse.create'ni data bilan chaqiradi", async () => {
    const data = { id: "w1", companyId: "c1", name: "Markaziy" };
    const tx = { warehouse: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new WarehousesRepository();

    const result = await repo.create(tx, data);

    expect(tx.warehouse.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.warehouse.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "w1", name: "Markaziy" };
    const tx = { warehouse: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new WarehousesRepository();

    const result = await repo.findById(tx, "w1");

    expect(tx.warehouse.findUnique).toHaveBeenCalledWith({ where: { id: "w1" } });
    expect(result).toBe(data);
  });

  it("list — tx.warehouse.findMany'ni companyId bilan chaqiradi", async () => {
    const tx = { warehouse: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new WarehousesRepository();

    await repo.list(tx, "c1");

    expect(tx.warehouse.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1" },
      orderBy: { name: "asc" },
    });
  });

  it("update — tx.warehouse.update'ni id va data bilan chaqiradi", async () => {
    const data = { name: "Yangi nom" };
    const updated = { id: "w1", ...data };
    const tx = { warehouse: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new WarehousesRepository();

    const result = await repo.update(tx, "w1", data);

    expect(tx.warehouse.update).toHaveBeenCalledWith({ where: { id: "w1" }, data });
    expect(result).toBe(updated);
  });
});
