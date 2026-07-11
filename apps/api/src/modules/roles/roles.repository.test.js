import { describe, it, expect, vi } from "vitest";
import { RolesRepository } from "./roles.repository.js";

describe("RolesRepository", () => {
  it("findSystemRoleByName — companyId null va isSystem true bo'yicha qidiradi", async () => {
    const role = { id: "r1", name: "owner", companyId: null, isSystem: true };
    const tx = { role: { findFirst: vi.fn().mockResolvedValue(role) } };
    const repo = new RolesRepository();

    const result = await repo.findSystemRoleByName(tx, "owner");

    expect(tx.role.findFirst).toHaveBeenCalledWith({
      where: { companyId: null, name: "owner", isSystem: true },
    });
    expect(result).toBe(role);
  });

  it("hasPermission — topilsa true qaytaradi", async () => {
    const tx = { rolePermission: { findFirst: vi.fn().mockResolvedValue({ roleId: "r1" }) } };
    const repo = new RolesRepository();

    const result = await repo.hasPermission(tx, "r1", "orders.confirm");

    expect(tx.rolePermission.findFirst).toHaveBeenCalledWith({
      where: { roleId: "r1", permission: { code: "orders.confirm" } },
    });
    expect(result).toBe(true);
  });

  it("hasPermission — topilmasa false qaytaradi", async () => {
    const tx = { rolePermission: { findFirst: vi.fn().mockResolvedValue(null) } };
    const repo = new RolesRepository();

    await expect(repo.hasPermission(tx, "r1", "orders.confirm")).resolves.toBe(false);
  });
});
