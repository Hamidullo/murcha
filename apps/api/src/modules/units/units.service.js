import { withTenant } from "../../lib/tenant-context.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Repository interfeys sifatida
 * konstruktor orqali bog'lanadi (DI), testda mock qo'yiladi.
 */
export class UnitsService {
  /**
   * @param {{ unitsRepository: import("./units.repository.js").UnitsRepository }} deps
   */
  constructor({ unitsRepository }) {
    this.unitsRepository = unitsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").Unit[]>}
   */
  async list(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) => this.unitsRepository.list(tx));
  }
}
