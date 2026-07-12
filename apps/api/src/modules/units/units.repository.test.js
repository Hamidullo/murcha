import { describe, it, expect, vi } from "vitest";
import { UnitsRepository } from "./units.repository.js";

describe("UnitsRepository", () => {
  it("findById — tx.unit.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "unit-dona", name: "dona" };
    const tx = { unit: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new UnitsRepository();

    const result = await repo.findById(tx, "unit-dona");

    expect(tx.unit.findUnique).toHaveBeenCalledWith({ where: { id: "unit-dona" } });
    expect(result).toBe(data);
  });

  it("list — tx.unit.findMany'ni nom tartibida chaqiradi", async () => {
    const tx = { unit: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new UnitsRepository();

    await repo.list(tx);

    expect(tx.unit.findMany).toHaveBeenCalledWith({ orderBy: { name: "asc" } });
  });
});
