import { describe, it, expect, vi } from "vitest";
import { ShowcaseRepository } from "./showcase.repository.js";

describe("ShowcaseRepository", () => {
  it("createLead — tx.lead.create'ni data bilan chaqiradi", async () => {
    const data = { id: "l1", companyId: "c1", name: "Ali", phone: "+998901234567" };
    const tx = { lead: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new ShowcaseRepository();

    const result = await repo.createLead(tx, data);

    expect(tx.lead.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });
});
