import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError, ForbiddenError } from "../../lib/errors.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Tizim rollari (`companyId:null`,
 * `isSystem:true`) o'zgartirilmaydi — faqat kompaniyaning o'z maxsus
 * rollari tahrirlanadi.
 */
export class RolesService {
  /**
   * @param {{ rolesRepository: import("./roles.repository.js").RolesRepository }} deps
   */
  constructor({ rolesRepository }) {
    this.rolesRepository = rolesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createRoleSchema._type} dto
   * @returns {Promise<import("@prisma/client").Role>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.rolesRepository.create(tx, { id: uuidv7(), companyId: auth.companyId, name: dto.name }),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").Role[]>}
   */
  async list(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.rolesRepository.list(tx, auth.companyId),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").Permission[]>}
   */
  async listAllPermissions(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.rolesRepository.listAllPermissions(tx),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updateRoleSchema._type} dto
   * @returns {Promise<import("@prisma/client").Role>}
   */
  async update(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const role = await this.#requireCustomRole(tx, auth, id);
      return this.rolesRepository.update(tx, role.id, dto);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<string[]>}
   */
  async listPermissions(auth, id) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const role = await this.#findAccessibleRole(tx, auth, id);
      if (!role) {
        throw new NotFoundError("Rol topilmadi");
      }
      return this.rolesRepository.listPermissionIdsForRole(tx, role.id);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").setRolePermissionsSchema._type} dto
   * @returns {Promise<void>}
   */
  async setPermissions(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const role = await this.#requireCustomRole(tx, auth, id);
      await this.rolesRepository.setRolePermissions(tx, role.id, dto.permissionIds);
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ companyId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Role | null>}
   */
  async #findAccessibleRole(tx, auth, id) {
    const role = await this.rolesRepository.findById(tx, id);
    if (!role || (role.companyId !== null && role.companyId !== auth.companyId)) {
      return null;
    }
    return role;
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ companyId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Role>}
   */
  async #requireCustomRole(tx, auth, id) {
    const role = await this.#findAccessibleRole(tx, auth, id);
    if (!role) {
      throw new NotFoundError("Rol topilmadi");
    }
    if (role.isSystem) {
      throw new ForbiddenError("Tizim rolini o'zgartirib bo'lmaydi");
    }
    return role;
  }
}
