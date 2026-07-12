import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { RolesService } = await import("./roles.service.js");
const { NotFoundError, ForbiddenError } = await import("../../lib/errors.js");

describe("RolesService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let rolesRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    rolesRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      listAllPermissions: vi.fn(),
      listPermissionIdsForRole: vi.fn(),
      setRolePermissions: vi.fn(),
    };
    service = new RolesService({ rolesRepository });
  });

  it("create — companyId bilan maxsus rol yaratadi", async () => {
    rolesRepository.create.mockResolvedValue({ id: "r2", name: "Sotuvchi" });

    const result = await service.create(auth, { name: "Sotuvchi" });

    expect(rolesRepository.create).toHaveBeenCalledWith(
      fakeTx,
      expect.objectContaining({ companyId: "c1", name: "Sotuvchi" }),
    );
    expect(result).toEqual({ id: "r2", name: "Sotuvchi" });
  });

  it("list — repository.list'ni companyId bilan chaqiradi", async () => {
    rolesRepository.list.mockResolvedValue([{ id: "r1" }]);

    const result = await service.list(auth);

    expect(rolesRepository.list).toHaveBeenCalledWith(fakeTx, "c1");
    expect(result).toEqual([{ id: "r1" }]);
  });

  it("listAllPermissions — repository.listAllPermissions'ni chaqiradi", async () => {
    rolesRepository.listAllPermissions.mockResolvedValue([{ id: "p1" }]);

    const result = await service.listAllPermissions(auth);

    expect(rolesRepository.listAllPermissions).toHaveBeenCalledWith(fakeTx);
    expect(result).toEqual([{ id: "p1" }]);
  });

  describe("update", () => {
    it("rol topilmasa NotFoundError otadi", async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(service.update(auth, "r2", { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
    });

    it("boshqa kompaniyaning maxsus roli bo'lsa NotFoundError otadi", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "r2", companyId: "c2", isSystem: false });

      await expect(service.update(auth, "r2", { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
    });

    it("tizim rolini o'zgartirmoqchi bo'lsa ForbiddenError otadi", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "r1", companyId: null, isSystem: true });

      await expect(service.update(auth, "r1", { name: "X" })).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("o'z maxsus rolini yangilaydi", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "r2", companyId: "c1", isSystem: false });
      rolesRepository.update.mockResolvedValue({ id: "r2", name: "Yangi nom" });

      const result = await service.update(auth, "r2", { name: "Yangi nom" });

      expect(rolesRepository.update).toHaveBeenCalledWith(fakeTx, "r2", { name: "Yangi nom" });
      expect(result).toEqual({ id: "r2", name: "Yangi nom" });
    });
  });

  describe("listPermissions", () => {
    it("rol topilmasa NotFoundError otadi", async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(service.listPermissions(auth, "r2")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("tizim rolining ruxsatlarini ham ko'rish mumkin (faqat tahrirlash taqiqlangan)", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "r1", companyId: null, isSystem: true });
      rolesRepository.listPermissionIdsForRole.mockResolvedValue(["p1"]);

      const result = await service.listPermissions(auth, "r1");

      expect(result).toEqual(["p1"]);
    });
  });

  describe("setPermissions", () => {
    it("tizim rolida ForbiddenError otadi", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "r1", companyId: null, isSystem: true });

      await expect(
        service.setPermissions(auth, "r1", { permissionIds: ["p1"] }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(rolesRepository.setRolePermissions).not.toHaveBeenCalled();
    });

    it("o'z maxsus rolida ruxsatlarni almashtiradi", async () => {
      rolesRepository.findById.mockResolvedValue({ id: "r2", companyId: "c1", isSystem: false });

      await service.setPermissions(auth, "r2", { permissionIds: ["p1", "p2"] });

      expect(rolesRepository.setRolePermissions).toHaveBeenCalledWith(fakeTx, "r2", ["p1", "p2"]);
    });
  });
});
