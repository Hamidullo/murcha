import { describe, it, expect, vi } from "vitest";
import { CompaniesRepository } from "./companies.repository.js";

describe("CompaniesRepository", () => {
  it("create — tx.company.create'ni data bilan chaqiradi", async () => {
    const data = { id: "c1", name: "Test Kompaniya" };
    const tx = { company: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new CompaniesRepository();

    const result = await repo.create(tx, data);

    expect(tx.company.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findById — tx.company.findUnique'ni id bilan chaqiradi", async () => {
    const data = { id: "c1", name: "Test Kompaniya" };
    const tx = { company: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new CompaniesRepository();

    const result = await repo.findById(tx, "c1");

    expect(tx.company.findUnique).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(result).toBe(data);
  });
});
