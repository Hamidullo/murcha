/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class RolesRepository {
  /**
   * Tizim rollari — `companyId: null`, seed'da yaratilgan (`prisma/seed.js`).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} name
   * @returns {Promise<import("@prisma/client").Role | null>}
   */
  async findSystemRoleByName(tx, name) {
    return tx.role.findFirst({ where: { companyId: null, name, isSystem: true } });
  }

  /**
   * `requirePermission()` middleware shu orqali tekshiradi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} roleId
   * @param {string} code
   * @returns {Promise<boolean>}
   */
  async hasPermission(tx, roleId, code) {
    const found = await tx.rolePermission.findFirst({ where: { roleId, permission: { code } } });
    return found !== null;
  }

  /**
   * Maxsus rol yaratish (`companyId` shu kompaniyaga, `isSystem:false`).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string, name: string }} data
   * @returns {Promise<import("@prisma/client").Role>}
   */
  async create(tx, data) {
    return tx.role.create({ data: { ...data, isSystem: false } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Role | null>}
   */
  async findById(tx, id) {
    return tx.role.findUnique({ where: { id } });
  }

  /**
   * Tizim rollari (`companyId:null`) + shu kompaniyaning maxsus rollari.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @returns {Promise<import("@prisma/client").Role[]>}
   */
  async list(tx, companyId) {
    return tx.role.findMany({
      where: { OR: [{ companyId: null }, { companyId }] },
      orderBy: { name: "asc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Role>}
   */
  async update(tx, id, data) {
    return tx.role.update({ where: { id }, data });
  }

  /**
   * Ruxsatlar matritsasi UI uchun — tizimdagi barcha ruxsat kodlari.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @returns {Promise<import("@prisma/client").Permission[]>}
   */
  async listAllPermissions(tx) {
    return tx.permission.findMany({ orderBy: { code: "asc" } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} roleId
   * @returns {Promise<string[]>}
   */
  async listPermissionIdsForRole(tx, roleId) {
    const rows = await tx.rolePermission.findMany({ where: { roleId } });
    return rows.map((row) => row.permissionId);
  }

  /**
   * Rolning ruxsatlar to'plamini almashtiradi (eskisi o'chiriladi, yangisi
   * yoziladi) — matritsa UI "saqlash" bosilganda to'liq holatni yuboradi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} roleId
   * @param {string[]} permissionIds
   * @returns {Promise<void>}
   */
  async setRolePermissions(tx, roleId, permissionIds) {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      });
    }
  }
}
