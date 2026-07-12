import { describe, it, expect, vi } from "vitest";
import { UserAssignmentsRepository } from "./user-assignments.repository.js";

describe("UserAssignmentsRepository", () => {
  it("findCompanyMember — companyId_userId unique kalit bilan qidiradi", async () => {
    const data = { id: "cm1" };
    const tx = { companyMember: { findUnique: vi.fn().mockResolvedValue(data) } };
    const repo = new UserAssignmentsRepository();

    const result = await repo.findCompanyMember(tx, "c1", "u1");

    expect(tx.companyMember.findUnique).toHaveBeenCalledWith({
      where: { companyId_userId: { companyId: "c1", userId: "u1" } },
    });
    expect(result).toBe(data);
  });

  it("findOne — companyMemberId/targetType/targetId bo'yicha qidiradi", async () => {
    const tx = { userAssignment: { findFirst: vi.fn().mockResolvedValue(null) } };
    const repo = new UserAssignmentsRepository();

    await repo.findOne(tx, "cm1", "sale_point", "sp1");

    expect(tx.userAssignment.findFirst).toHaveBeenCalledWith({
      where: { companyMemberId: "cm1", targetType: "sale_point", targetId: "sp1" },
    });
  });

  it("create — tx.userAssignment.create'ni data bilan chaqiradi", async () => {
    const data = { id: "a1", companyMemberId: "cm1", targetType: "sale_point", targetId: "sp1" };
    const tx = { userAssignment: { create: vi.fn().mockResolvedValue(data) } };
    const repo = new UserAssignmentsRepository();

    const result = await repo.create(tx, data);

    expect(tx.userAssignment.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(data);
  });

  it("listByTarget — targetType/targetId bo'yicha, companyMember.user bilan include", async () => {
    const tx = { userAssignment: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new UserAssignmentsRepository();

    await repo.listByTarget(tx, "sale_point", "sp1");

    expect(tx.userAssignment.findMany).toHaveBeenCalledWith({
      where: { targetType: "sale_point", targetId: "sp1" },
      include: {
        companyMember: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });
  });

  it("remove — tx.userAssignment.delete'ni id bilan chaqiradi", async () => {
    const tx = { userAssignment: { delete: vi.fn().mockResolvedValue({ id: "a1" }) } };
    const repo = new UserAssignmentsRepository();

    await repo.remove(tx, "a1");

    expect(tx.userAssignment.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
  });

  it("findSalePointIdForUser — topilsa targetId'ni qaytaradi", async () => {
    const tx = {
      userAssignment: { findFirst: vi.fn().mockResolvedValue({ targetId: "sp1" }) },
    };
    const repo = new UserAssignmentsRepository();

    const result = await repo.findSalePointIdForUser(tx, "c1", "u1");

    expect(tx.userAssignment.findFirst).toHaveBeenCalledWith({
      where: { targetType: "sale_point", companyMember: { companyId: "c1", userId: "u1" } },
    });
    expect(result).toBe("sp1");
  });

  it("findSalePointIdForUser — topilmasa null qaytaradi", async () => {
    const tx = { userAssignment: { findFirst: vi.fn().mockResolvedValue(null) } };
    const repo = new UserAssignmentsRepository();

    const result = await repo.findSalePointIdForUser(tx, "c1", "u1");

    expect(result).toBeNull();
  });
});
