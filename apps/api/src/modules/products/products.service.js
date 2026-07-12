import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError, ConflictError } from "../../lib/errors.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Repository interfeys sifatida
 * konstruktor orqali bog'lanadi (DI), testda mock qo'yiladi.
 */
export class ProductsService {
  /**
   * @param {{
   *   productsRepository: import("./products.repository.js").ProductsRepository,
   *   categoriesRepository: import("../categories/categories.repository.js").CategoriesRepository,
   *   unitsRepository: import("../units/units.repository.js").UnitsRepository,
   * }} deps
   */
  constructor({ productsRepository, categoriesRepository, unitsRepository }) {
    this.productsRepository = productsRepository;
    this.categoriesRepository = categoriesRepository;
    this.unitsRepository = unitsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createProductSchema._type} dto
   * @returns {Promise<import("@prisma/client").Product>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.productsRepository.findBySku(tx, dto.sku);
      if (existing) {
        throw new ConflictError("Bu SKU bilan mahsulot allaqachon mavjud");
      }
      const unit = await this.unitsRepository.findById(tx, dto.baseUnitId);
      if (!unit) {
        throw new NotFoundError("Asosiy birlik topilmadi");
      }
      if (dto.categoryId) {
        const category = await this.categoriesRepository.findById(tx, dto.categoryId);
        if (!category) {
          throw new NotFoundError("Kategoriya topilmadi");
        }
      }
      return this.productsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        ...dto,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").Product[]>}
   */
  async list(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.productsRepository.list(tx, auth.companyId),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Product>}
   */
  async getById(auth, id) {
    const product = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.productsRepository.findById(tx, id),
    );
    if (!product) {
      throw new NotFoundError("Mahsulot topilmadi");
    }
    return product;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updateProductSchema._type} dto
   * @returns {Promise<import("@prisma/client").Product>}
   */
  async update(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.productsRepository.findById(tx, id);
      if (!existing) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      if (dto.baseUnitId) {
        const unit = await this.unitsRepository.findById(tx, dto.baseUnitId);
        if (!unit) {
          throw new NotFoundError("Asosiy birlik topilmadi");
        }
      }
      if (dto.categoryId) {
        const category = await this.categoriesRepository.findById(tx, dto.categoryId);
        if (!category) {
          throw new NotFoundError("Kategoriya topilmadi");
        }
      }
      if (dto.sku && dto.sku !== existing.sku) {
        const skuOwner = await this.productsRepository.findBySku(tx, dto.sku);
        if (skuOwner) {
          throw new ConflictError("Bu SKU bilan mahsulot allaqachon mavjud");
        }
      }
      return this.productsRepository.update(tx, id, dto);
    });
  }

  /**
   * Soft-delete: `status` → `archived`, `deletedAt` belgilanadi. Jismoniy
   * o'chirish yo'q — mahsulot boshqa jadvallarda (`stock`, `order_items`...)
   * ishlatilgan bo'lishi mumkin (CLAUDE.md: ma'lumotlar yaxlitligi).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Product>}
   */
  async archive(auth, id) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.productsRepository.findById(tx, id);
      if (!existing) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      return this.productsRepository.update(tx, id, {
        status: "archived",
        deletedAt: new Date(),
      });
    });
  }
}
