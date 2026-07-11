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
}
