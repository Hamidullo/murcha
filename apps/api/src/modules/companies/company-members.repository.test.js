import { describe, it, expect, vi } from "vitest";
import { CompanyMembersRepository } from "./company-members.repository.js";

describe("CompanyMembersRepository", () => {
  it("create — tx.companyMember.create'ni data bilan chaqiradi", async () => {
    const data = { id: "cm1", companyId: "c1", userId: "u1", roleId: "r1" };
    const tx = { companyMember: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new CompanyMembersRepository();

    const result = await repo.create(tx, data);

    expect(tx.companyMember.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("findByUserId — faqat active a'zolikni company/role bilan qaytaradi", async () => {
    const rows = [{ id: "cm1", companyId: "c1", userId: "u1" }];
    const tx = { companyMember: { findMany: vi.fn().mockResolvedValue(rows) } };
    const repo = new CompanyMembersRepository();

    const result = await repo.findByUserId(tx, "u1");

    expect(tx.companyMember.findMany).toHaveBeenCalledWith({
      where: { userId: "u1", status: "active" },
      include: { company: true, role: true },
    });
    expect(result).toBe(rows);
  });
});
