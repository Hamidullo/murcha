import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";

/** BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). */
export class CounterpartiesService {
  /**
   * @param {{ counterpartiesRepository: import("./counterparties.repository.js").CounterpartiesRepository }} deps
   */
  constructor({ counterpartiesRepository }) {
    this.counterpartiesRepository = counterpartiesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createCounterpartySchema._type} dto
   * @returns {Promise<import("@prisma/client").Counterparty>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.counterpartiesRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        ...dto,
      }),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ type?: string, search?: string }} [filters]
   * @returns {Promise<import("@prisma/client").Counterparty[]>}
   */
  async list(auth, filters) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.counterpartiesRepository.list(tx, auth.companyId, filters),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Counterparty>}
   */
  async getById(auth, id) {
    const counterparty = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.counterpartiesRepository.findById(tx, id),
    );
    if (!counterparty) {
      throw new NotFoundError("Kontragent topilmadi");
    }
    return counterparty;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updateCounterpartySchema._type} dto
   * @returns {Promise<import("@prisma/client").Counterparty>}
   */
  async update(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.counterpartiesRepository.findById(tx, id);
      if (!existing) {
        throw new NotFoundError("Kontragent topilmadi");
      }
      return this.counterpartiesRepository.update(tx, id, dto);
    });
  }

  /**
   * Soft-delete: jismoniy o'chirish yo'q — kontragent `warehouse_docs`/
   * `purchase_orders`/`debt_movements`da ishlatilgan bo'lishi mumkin.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Counterparty>}
   */
  async archive(auth, id) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.counterpartiesRepository.findById(tx, id);
      if (!existing) {
        throw new NotFoundError("Kontragent topilmadi");
      }
      return this.counterpartiesRepository.update(tx, id, {
        isActive: false,
        deletedAt: new Date(),
      });
    });
  }
}
