import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Repository interfeys sifatida
 * konstruktor orqali bog'lanadi (DI), testda mock qo'yiladi.
 */
export class WarehousesService {
  /**
   * @param {{ warehousesRepository: import("./warehouses.repository.js").WarehousesRepository }} deps
   */
  constructor({ warehousesRepository }) {
    this.warehousesRepository = warehousesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createWarehouseSchema._type} dto
   * @returns {Promise<import("@prisma/client").Warehouse>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.warehousesRepository.create(tx, { id: uuidv7(), companyId: auth.companyId, ...dto }),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").Warehouse[]>}
   */
  async list(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.warehousesRepository.list(tx, auth.companyId),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Warehouse>}
   */
  async getById(auth, id) {
    const warehouse = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.warehousesRepository.findById(tx, id),
    );
    if (!warehouse) {
      throw new NotFoundError("Sklad topilmadi");
    }
    return warehouse;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updateWarehouseSchema._type} dto
   * @returns {Promise<import("@prisma/client").Warehouse>}
   */
  async update(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.warehousesRepository.findById(tx, id);
      if (!existing) {
        throw new NotFoundError("Sklad topilmadi");
      }
      return this.warehousesRepository.update(tx, id, dto);
    });
  }
}
