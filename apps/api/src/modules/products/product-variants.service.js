import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Repository interfeys sifatida
 * konstruktor orqali bog'lanadi (DI), testda mock qo'yiladi.
 */
export class ProductVariantsService {
  /**
   * @param {{
   *   productVariantsRepository: import("./product-variants.repository.js").ProductVariantsRepository,
   *   productsRepository: import("./products.repository.js").ProductsRepository,
   * }} deps
   */
  constructor({ productVariantsRepository, productsRepository }) {
    this.productVariantsRepository = productVariantsRepository;
    this.productsRepository = productsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {import("@murcha/shared").createProductVariantSchema._type} dto
   * @returns {Promise<import("@prisma/client").ProductVariant>}
   */
  async create(auth, productId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      return this.productVariantsRepository.create(tx, {
        id: uuidv7(),
        productId,
        ...dto,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductVariant[]>}
   */
  async list(auth, productId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      return this.productVariantsRepository.list(tx, productId);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {string} variantId
   * @returns {Promise<import("@prisma/client").ProductVariant>}
   */
  async getById(auth, productId, variantId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      const variant = await this.productVariantsRepository.findById(tx, variantId);
      if (!variant || variant.productId !== productId) {
        throw new NotFoundError("Variant topilmadi");
      }
      return variant;
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {string} variantId
   * @param {import("@murcha/shared").updateProductVariantSchema._type} dto
   * @returns {Promise<import("@prisma/client").ProductVariant>}
   */
  async update(auth, productId, variantId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      const variant = await this.productVariantsRepository.findById(tx, variantId);
      if (!variant || variant.productId !== productId) {
        throw new NotFoundError("Variant topilmadi");
      }
      return this.productVariantsRepository.update(tx, variantId, dto);
    });
  }

  /**
   * Soft-delete: `deletedAt` belgilanadi. Variant boshqa jadvallarda
   * (`stock`, `order_items`...) ishlatilgan bo'lishi mumkin (CLAUDE.md:
   * ma'lumotlar yaxlitligi).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {string} variantId
   * @returns {Promise<import("@prisma/client").ProductVariant>}
   */
  async archive(auth, productId, variantId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      const variant = await this.productVariantsRepository.findById(tx, variantId);
      if (!variant || variant.productId !== productId) {
        throw new NotFoundError("Variant topilmadi");
      }
      return this.productVariantsRepository.update(tx, variantId, { deletedAt: new Date() });
    });
  }
}
