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

  it("findByCompanyAndUser — companyId_userId unique kalit bilan qidiradi", async () => {
    const tx = { companyMember: { findUnique: vi.fn().mockResolvedValue(null) } };
    const repo = new CompanyMembersRepository();

    await repo.findByCompanyAndUser(tx, "c1", "u1");

    expect(tx.companyMember.findUnique).toHaveBeenCalledWith({
      where: { companyId_userId: { companyId: "c1", userId: "u1" } },
    });
  });

  it("findById — user va role bilan include qiladi", async () => {
    const member = { id: "cm1" };
    const tx = { companyMember: { findUnique: vi.fn().mockResolvedValue(member) } };
    const repo = new CompanyMembersRepository();

    const result = await repo.findById(tx, "cm1");

    expect(tx.companyMember.findUnique).toHaveBeenCalledWith({
      where: { id: "cm1" },
      include: { user: true, role: true },
    });
    expect(result).toBe(member);
  });

  it("list — companyId bo'yicha, user/role bilan include, yaratilgan sana bo'yicha tartiblangan", async () => {
    const tx = { companyMember: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new CompanyMembersRepository();

    await repo.list(tx, "c1");

    expect(tx.companyMember.findMany).toHaveBeenCalledWith({
      where: { companyId: "c1" },
      include: { user: true, role: true },
      orderBy: { createdAt: "asc" },
    });
  });

  it("update — tx.companyMember.update'ni id va data bilan chaqiradi", async () => {
    const updated = { id: "cm1", status: "blocked" };
    const tx = { companyMember: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new CompanyMembersRepository();

    const result = await repo.update(tx, "cm1", { status: "blocked" });

    expect(tx.companyMember.update).toHaveBeenCalledWith({
      where: { id: "cm1" },
      data: { status: "blocked" },
    });
    expect(result).toBe(updated);
  });
});
