import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Repository interfeys sifatida
 * konstruktor orqali bog'lanadi (DI), testda mock qo'yiladi.
 */
export class ProductPricesService {
  /**
   * @param {{
   *   productPricesRepository: import("./product-prices.repository.js").ProductPricesRepository,
   *   productsRepository: import("./products.repository.js").ProductsRepository,
   *   priceTypesRepository: import("../price-types/price-types.repository.js").PriceTypesRepository,
   * }} deps
   */
  constructor({ productPricesRepository, productsRepository, priceTypesRepository }) {
    this.productPricesRepository = productPricesRepository;
    this.productsRepository = productsRepository;
    this.priceTypesRepository = priceTypesRepository;
  }

  /**
   * Yangi narx qo'shish — UPDATE yo'q, har doim yangi qator (`validFrom`
   * berilmasa hozirgi vaqt ishlatiladi).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {import("@murcha/shared").createProductPriceSchema._type} dto
   * @returns {Promise<import("@prisma/client").ProductPrice>}
   */
  async addPrice(auth, productId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      const priceType = await this.priceTypesRepository.findById(tx, dto.priceTypeId);
      if (!priceType) {
        throw new NotFoundError("Narx turi topilmadi");
      }
      return this.productPricesRepository.create(tx, {
        id: uuidv7(),
        productId,
        priceTypeId: dto.priceTypeId,
        price: dto.price,
        currency: dto.currency,
        validFrom: dto.validFrom ?? new Date(),
        createdBy: auth.userId,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductPrice[]>}
   */
  async listPrices(auth, productId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      return this.productPricesRepository.listByProduct(tx, productId);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductPrice[]>}
   */
  async currentPrices(auth, productId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      return this.productPricesRepository.listCurrentByProduct(tx, productId, new Date());
    });
  }
}
