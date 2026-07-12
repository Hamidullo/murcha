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

  it("create — isSystem:false bilan tx.role.create'ni chaqiradi", async () => {
    const data = { id: "r2", companyId: "c1", name: "Sotuvchi" };
    const tx = { role: { create: vi.fn().mockResolvedValue({ ...data, isSystem: false }) } };
    const repo = new RolesRepository();

    const result = await repo.create(tx, data);

    expect(tx.role.create).toHaveBeenCalledWith({ data: { ...data, isSystem: false } });
    expect(result).toEqual({ ...data, isSystem: false });
  });

  it("findById — tx.role.findUnique'ni id bilan chaqiradi", async () => {
    const role = { id: "r2" };
    const tx = { role: { findUnique: vi.fn().mockResolvedValue(role) } };
    const repo = new RolesRepository();

    const result = await repo.findById(tx, "r2");

    expect(tx.role.findUnique).toHaveBeenCalledWith({ where: { id: "r2" } });
    expect(result).toBe(role);
  });

  it("list — companyId null yoki shu kompaniya bo'yicha qidiradi", async () => {
    const tx = { role: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new RolesRepository();

    await repo.list(tx, "c1");

    expect(tx.role.findMany).toHaveBeenCalledWith({
      where: { OR: [{ companyId: null }, { companyId: "c1" }] },
      orderBy: { name: "asc" },
    });
  });

  it("update — tx.role.update'ni id va data bilan chaqiradi", async () => {
    const updated = { id: "r2", name: "Yangi nom" };
    const tx = { role: { update: vi.fn().mockResolvedValue(updated) } };
    const repo = new RolesRepository();

    const result = await repo.update(tx, "r2", { name: "Yangi nom" });

    expect(tx.role.update).toHaveBeenCalledWith({
      where: { id: "r2" },
      data: { name: "Yangi nom" },
    });
    expect(result).toBe(updated);
  });

  it("listAllPermissions — tx.permission.findMany'ni chaqiradi", async () => {
    const tx = { permission: { findMany: vi.fn().mockResolvedValue([]) } };
    const repo = new RolesRepository();

    await repo.listAllPermissions(tx);

    expect(tx.permission.findMany).toHaveBeenCalledWith({ orderBy: { code: "asc" } });
  });

  it("listPermissionIdsForRole — rolePermission qatorlaridan permissionId'larni oladi", async () => {
    const tx = {
      rolePermission: {
        findMany: vi.fn().mockResolvedValue([{ permissionId: "p1" }, { permissionId: "p2" }]),
      },
    };
    const repo = new RolesRepository();

    const result = await repo.listPermissionIdsForRole(tx, "r1");

    expect(tx.rolePermission.findMany).toHaveBeenCalledWith({ where: { roleId: "r1" } });
    expect(result).toEqual(["p1", "p2"]);
  });

  describe("setRolePermissions", () => {
    it("avval eski ruxsatlarni o'chiradi, keyin yangilarini yozadi", async () => {
      const tx = { rolePermission: { deleteMany: vi.fn(), createMany: vi.fn() } };
      const repo = new RolesRepository();

      await repo.setRolePermissions(tx, "r1", ["p1", "p2"]);

      expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: "r1" } });
      expect(tx.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: "r1", permissionId: "p1" },
          { roleId: "r1", permissionId: "p2" },
        ],
      });
    });

    it("bo'sh ro'yxat berilsa faqat o'chiradi, createMany chaqirilmaydi", async () => {
      const tx = { rolePermission: { deleteMany: vi.fn(), createMany: vi.fn() } };
      const repo = new RolesRepository();

      await repo.setRolePermissions(tx, "r1", []);

      expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: "r1" } });
      expect(tx.rolePermission.createMany).not.toHaveBeenCalled();
    });
  });
});
