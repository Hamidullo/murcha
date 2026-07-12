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
   *   productUnitsRepository: import("./product-units.repository.js").ProductUnitsRepository,
   *   productBarcodesRepository: import("./product-barcodes.repository.js").ProductBarcodesRepository,
   * }} deps
   */
  constructor({
    productsRepository,
    categoriesRepository,
    unitsRepository,
    productUnitsRepository,
    productBarcodesRepository,
  }) {
    this.productsRepository = productsRepository;
    this.categoriesRepository = categoriesRepository;
    this.unitsRepository = unitsRepository;
    this.productUnitsRepository = productUnitsRepository;
    this.productBarcodesRepository = productBarcodesRepository;
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
   * @param {import("@murcha/shared").listProductsQuerySchema._type} [filters]
   * @returns {Promise<import("@prisma/client").Product[]>}
   */
  async list(auth, filters = {}) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.productsRepository.list(tx, auth.companyId, filters),
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

  /**
   * Shtrix-kod skaner uchun (kamera/USB) — topilgan shtrix-kod orqali
   * to'g'ridan-to'g'ri mahsulotni qaytaradi. `product_barcodes`da RLS bor
   * (`company_id` ustuni bilan), shuning uchun boshqa kompaniya shtrix-kodi
   * hech qachon qaytmaydi.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} barcode
   * @returns {Promise<import("@prisma/client").Product>}
   */
  async getByBarcode(auth, barcode) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const productBarcode = await this.productBarcodesRepository.findByBarcode(tx, barcode);
      if (!productBarcode) {
        throw new NotFoundError("Bu shtrix-kod bo'yicha mahsulot topilmadi");
      }
      const product = await this.productsRepository.findById(tx, productBarcode.productId);
      if (!product || product.deletedAt) {
        throw new NotFoundError("Bu shtrix-kod bo'yicha mahsulot topilmadi");
      }
      return product;
    });
  }

  /**
   * O'ram-birlik qo'shish (masalan "1 blok = 20 dona"). Asosiy birlik
   * (`baseUnitId`) qayta qo'shilmaydi — konvertatsiya har doim asosiy
   * birlikka nisbatan.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {import("@murcha/shared").createProductUnitSchema._type} dto
   * @returns {Promise<import("@prisma/client").ProductUnit>}
   */
  async addUnit(auth, productId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      if (dto.unitId === product.baseUnitId) {
        throw new ConflictError("Bu birlik allaqachon asosiy birlik");
      }
      const unit = await this.unitsRepository.findById(tx, dto.unitId);
      if (!unit) {
        throw new NotFoundError("Birlik topilmadi");
      }
      const existing = await this.productUnitsRepository.findByProductAndUnit(
        tx,
        productId,
        dto.unitId,
      );
      if (existing) {
        throw new ConflictError("Bu birlik allaqachon qo'shilgan");
      }
      return this.productUnitsRepository.create(tx, {
        id: uuidv7(),
        productId,
        unitId: dto.unitId,
        factor: dto.factor,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductUnit[]>}
   */
  async listUnits(auth, productId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      return this.productUnitsRepository.list(tx, productId);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {string} productUnitId
   * @returns {Promise<void>}
   */
  async removeUnit(auth, productId, productUnitId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      const productUnit = await this.productUnitsRepository.findById(tx, productUnitId);
      if (!productUnit || productUnit.productId !== productId) {
        throw new NotFoundError("O'ram birligi topilmadi");
      }
      await this.productUnitsRepository.delete(tx, productUnitId);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {import("@murcha/shared").createProductBarcodeSchema._type} dto
   * @returns {Promise<import("@prisma/client").ProductBarcode>}
   */
  async addBarcode(auth, productId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      if (dto.unitId) {
        const unit = await this.unitsRepository.findById(tx, dto.unitId);
        if (!unit) {
          throw new NotFoundError("Birlik topilmadi");
        }
      }
      const existing = await this.productBarcodesRepository.findByBarcode(tx, dto.barcode);
      if (existing) {
        throw new ConflictError("Bu shtrix-kod allaqachon band");
      }
      return this.productBarcodesRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        productId,
        unitId: dto.unitId ?? null,
        barcode: dto.barcode,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductBarcode[]>}
   */
  async listBarcodes(auth, productId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      return this.productBarcodesRepository.list(tx, productId);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {string} barcodeId
   * @returns {Promise<void>}
   */
  async removeBarcode(auth, productId, barcodeId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      const barcode = await this.productBarcodesRepository.findById(tx, barcodeId);
      if (!barcode || barcode.productId !== productId) {
        throw new NotFoundError("Shtrix-kod topilmadi");
      }
      await this.productBarcodesRepository.delete(tx, barcodeId);
    });
  }
}
