import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Repository interfeys sifatida
 * konstruktor orqali bog'lanadi (DI), testda mock qo'yiladi.
 */
export class CategoriesService {
  /**
   * @param {{ categoriesRepository: import("./categories.repository.js").CategoriesRepository }} deps
   */
  constructor({ categoriesRepository }) {
    this.categoriesRepository = categoriesRepository;
  }

  /**
   * `parentId` berilsa — o'sha kategoriya shu kompaniyada mavjudligi
   * tekshiriladi (RLS: boshqa kompaniya kategoriyasi `findById`da ko'rinmaydi).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createCategorySchema._type} dto
   * @returns {Promise<import("@prisma/client").Category>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      if (dto.parentId) {
        const parent = await this.categoriesRepository.findById(tx, dto.parentId);
        if (!parent) {
          throw new NotFoundError("Ota kategoriya topilmadi");
        }
      }
      return this.categoriesRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        ...dto,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").Category[]>}
   */
  async list(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.categoriesRepository.list(tx, auth.companyId),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Category>}
   */
  async getById(auth, id) {
    const category = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.categoriesRepository.findById(tx, id),
    );
    if (!category) {
      throw new NotFoundError("Kategoriya topilmadi");
    }
    return category;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updateCategorySchema._type} dto
   * @returns {Promise<import("@prisma/client").Category>}
   */
  async update(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.categoriesRepository.findById(tx, id);
      if (!existing) {
        throw new NotFoundError("Kategoriya topilmadi");
      }
      if (dto.parentId) {
        if (dto.parentId === id) {
          throw new ValidationError("Kategoriya o'zini ota qilib bo'lmaydi");
        }
        const parent = await this.categoriesRepository.findById(tx, dto.parentId);
        if (!parent) {
          throw new NotFoundError("Ota kategoriya topilmadi");
        }
      }
      return this.categoriesRepository.update(tx, id, dto);
    });
  }
}
