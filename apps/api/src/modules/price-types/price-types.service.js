import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Repository interfeys sifatida
 * konstruktor orqali bog'lanadi (DI), testda mock qo'yiladi.
 */
export class PriceTypesService {
  /**
   * @param {{ priceTypesRepository: import("./price-types.repository.js").PriceTypesRepository }} deps
   */
  constructor({ priceTypesRepository }) {
    this.priceTypesRepository = priceTypesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createPriceTypeSchema._type} dto
   * @returns {Promise<import("@prisma/client").PriceType>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      if (dto.isDefault) {
        await this.priceTypesRepository.unsetDefault(tx, auth.companyId, null);
      }
      return this.priceTypesRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        ...dto,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").PriceType[]>}
   */
  async list(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.priceTypesRepository.list(tx, auth.companyId),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").PriceType>}
   */
  async getById(auth, id) {
    const priceType = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.priceTypesRepository.findById(tx, id),
    );
    if (!priceType) {
      throw new NotFoundError("Narx turi topilmadi");
    }
    return priceType;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updatePriceTypeSchema._type} dto
   * @returns {Promise<import("@prisma/client").PriceType>}
   */
  async update(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.priceTypesRepository.findById(tx, id);
      if (!existing) {
        throw new NotFoundError("Narx turi topilmadi");
      }
      if (dto.isDefault) {
        await this.priceTypesRepository.unsetDefault(tx, auth.companyId, id);
      }
      return this.priceTypesRepository.update(tx, id, dto);
    });
  }
}
