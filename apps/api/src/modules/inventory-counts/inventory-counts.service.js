import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError, ConflictError, ValidationError } from "../../lib/errors.js";
import { applyStockAdjustment } from "../warehouse-docs/create-confirmed-adjustment.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Boshlash (`create`) + sanoq
 * kiritish (`submitCount`) + tasdiqlash (`approve`).
 */
export class InventoryCountsService {
  /**
   * @param {{
   *   inventoryCountsRepository: import("./inventory-counts.repository.js").InventoryCountsRepository,
   *   warehousesRepository: import("../warehouses/warehouses.repository.js").WarehousesRepository,
   *   productsRepository: import("../products/products.repository.js").ProductsRepository,
   *   stockRepository: import("../stock/stock.repository.js").StockRepository,
   *   stockMovementsRepository: import("../stock/stock-movements.repository.js").StockMovementsRepository,
   *   warehouseDocsRepository: import("../warehouse-docs/warehouse-docs.repository.js").WarehouseDocsRepository,
   * }} deps
   */
  constructor({
    inventoryCountsRepository,
    warehousesRepository,
    productsRepository,
    stockRepository,
    stockMovementsRepository,
    warehouseDocsRepository,
  }) {
    this.inventoryCountsRepository = inventoryCountsRepository;
    this.warehousesRepository = warehousesRepository;
    this.productsRepository = productsRepository;
    this.stockRepository = stockRepository;
    this.stockMovementsRepository = stockMovementsRepository;
    this.warehouseDocsRepository = warehouseDocsRepository;
  }

  /**
   * Sklad qoldig'ini shu payt suratga oladi — har `Stock` qatori uchun
   * `systemQty` bilan `InventoryCountItem` yaratiladi (`countedQty` hali
   * `null` — hodim keyin to'ldiradi).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createInventoryCountSchema._type} dto
   * @returns {Promise<import("@prisma/client").InventoryCount>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const warehouse = await this.warehousesRepository.findById(tx, dto.warehouseId);
      if (!warehouse) {
        throw new NotFoundError("Sklad topilmadi");
      }

      const stockRows = await this.stockRepository.list(tx, auth.companyId, {
        warehouseId: dto.warehouseId,
      });

      const count = await this.inventoryCountsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        warehouseId: dto.warehouseId,
        status: "in_progress",
        startedBy: auth.userId,
        startedAt: new Date(),
      });

      for (const stock of stockRows) {
        await this.inventoryCountsRepository.createItem(tx, {
          id: uuidv7(),
          countId: count.id,
          productId: stock.productId,
          variantId: stock.variantId,
          batchId: stock.batchId,
          systemQty: stock.quantity,
        });
      }

      return this.inventoryCountsRepository.findById(tx, count.id);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ warehouseId?: string, status?: string }} [filters]
   * @returns {Promise<import("@prisma/client").InventoryCount[]>}
   */
  async list(auth, filters) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.inventoryCountsRepository.list(tx, auth.companyId, filters),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").InventoryCount>}
   */
  async getById(auth, id) {
    const count = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.inventoryCountsRepository.findById(tx, id),
    );
    if (!count) {
      throw new NotFoundError("Inventarizatsiya topilmadi");
    }
    return count;
  }

  /**
   * Bitta qator uchun sanoq natijasini kiritadi. `diff` shu yerda
   * hisoblanadi (`countedQty - systemQty`) — schema.prisma izohi: "diff —
   * app/service qatlamida hisoblanadi".
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} countId
   * @param {string} itemId
   * @param {import("@murcha/shared").updateInventoryCountItemSchema._type} dto
   * @returns {Promise<import("@prisma/client").InventoryCountItem>}
   */
  async submitCount(auth, countId, itemId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const count = await this.inventoryCountsRepository.findById(tx, countId);
      if (!count) {
        throw new NotFoundError("Inventarizatsiya topilmadi");
      }
      if (count.status !== "in_progress") {
        throw new ConflictError("Faqat jarayondagi inventarizatsiyada sanoq kiritish mumkin");
      }

      const item = await this.inventoryCountsRepository.findItemById(tx, itemId);
      if (!item || item.countId !== countId) {
        throw new NotFoundError("Qator topilmadi");
      }

      const diff = dto.countedQty - Number(item.systemQty);
      return this.inventoryCountsRepository.updateItem(tx, itemId, {
        countedQty: dto.countedQty,
        diff,
      });
    });
  }

  /**
   * Barcha qatorda `countedQty` kiritilganini talab qiladi, so'ng har farq
   * (`diff !== 0`) uchun darhol tasdiqlangan tuzatish hujjati yaratadi
   * (`create-confirmed-adjustment.js` — `imports` moduli bilan bo'lishilgan).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} countId
   * @returns {Promise<import("@prisma/client").InventoryCount>}
   */
  async approve(auth, countId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const count = await this.inventoryCountsRepository.findById(tx, countId);
      if (!count) {
        throw new NotFoundError("Inventarizatsiya topilmadi");
      }
      if (count.status !== "in_progress") {
        throw new ConflictError("Faqat jarayondagi inventarizatsiyani tasdiqlash mumkin");
      }
      if (count.items.some((item) => item.countedQty == null)) {
        throw new ValidationError("Barcha qatorlar uchun sanoq kiritilishi kerak");
      }

      const adjustmentRepos = {
        warehouseDocsRepository: this.warehouseDocsRepository,
        stockRepository: this.stockRepository,
        stockMovementsRepository: this.stockMovementsRepository,
      };

      for (const item of count.items) {
        const diff = Number(item.countedQty) - Number(item.systemQty);
        if (diff === 0) {
          continue;
        }
        const product = await this.productsRepository.findById(tx, item.productId);
        await applyStockAdjustment(tx, adjustmentRepos, {
          companyId: auth.companyId,
          userId: auth.userId,
          warehouseId: count.warehouseId,
          productId: item.productId,
          unitId: product.baseUnitId,
          variantId: item.variantId,
          batchId: item.batchId,
          delta: diff,
        });
      }

      return this.inventoryCountsRepository.update(tx, countId, {
        status: "approved",
        approvedBy: auth.userId,
        approvedAt: new Date(),
      });
    });
  }
}
