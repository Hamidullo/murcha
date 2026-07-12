import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  InsufficientStockError,
} from "../../lib/errors.js";
import { computeQtyBase } from "../../lib/qty-base.js";

/** Hujjat raqami prefiksi (DATABASE.md: `KIR-2026-00001` uslubi). */
const NUMBER_PREFIX = {
  receipt: "KIR",
  issue: "CHIQ",
  writeoff: "SPIS",
  transfer: "KOCH",
};

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Qoralama hujjat CRUD'i +
 * tasdiqlash/storno oqimi (`stock`/`stock_movements`).
 */
export class WarehouseDocsService {
  /**
   * @param {{
   *   warehouseDocsRepository: import("./warehouse-docs.repository.js").WarehouseDocsRepository,
   *   warehousesRepository: import("../warehouses/warehouses.repository.js").WarehousesRepository,
   *   productsRepository: import("../products/products.repository.js").ProductsRepository,
   *   productUnitsRepository: import("../products/product-units.repository.js").ProductUnitsRepository,
   *   stockRepository: import("../stock/stock.repository.js").StockRepository,
   *   stockMovementsRepository: import("../stock/stock-movements.repository.js").StockMovementsRepository,
   * }} deps
   */
  constructor({
    warehouseDocsRepository,
    warehousesRepository,
    productsRepository,
    productUnitsRepository,
    stockRepository,
    stockMovementsRepository,
  }) {
    this.warehouseDocsRepository = warehouseDocsRepository;
    this.warehousesRepository = warehousesRepository;
    this.productsRepository = productsRepository;
    this.productUnitsRepository = productUnitsRepository;
    this.stockRepository = stockRepository;
    this.stockMovementsRepository = stockMovementsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createWarehouseDocSchema._type} dto
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const warehouse = await this.warehousesRepository.findById(tx, dto.warehouseId);
      if (!warehouse) {
        throw new NotFoundError("Sklad topilmadi");
      }
      if (dto.type === "transfer") {
        const toWarehouse = await this.warehousesRepository.findById(tx, dto.toWarehouseId);
        if (!toWarehouse) {
          throw new NotFoundError("Qabul qiluvchi sklad topilmadi");
        }
      }

      const year = new Date().getFullYear();
      const counter = await this.warehouseDocsRepository.nextCounter(
        tx,
        auth.companyId,
        dto.type,
        year,
      );
      const number = `${NUMBER_PREFIX[dto.type]}-${year}-${String(counter).padStart(5, "0")}`;

      return this.warehouseDocsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        type: dto.type,
        number,
        warehouseId: dto.warehouseId,
        toWarehouseId: dto.toWarehouseId ?? null,
        counterpartyId: dto.counterpartyId ?? null,
        purchaseOrderId: dto.purchaseOrderId ?? null,
        status: "draft",
        currency: dto.currency ?? "UZS",
        exchangeRate: dto.exchangeRate ?? null,
        reason: dto.reason ?? null,
        total: 0,
        createdBy: auth.userId,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ type?: string, status?: string, warehouseId?: string }} [filters]
   * @returns {Promise<import("@prisma/client").WarehouseDoc[]>}
   */
  async list(auth, filters) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.warehouseDocsRepository.list(tx, auth.companyId, filters),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async getById(auth, id) {
    const doc = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.warehouseDocsRepository.findById(tx, id),
    );
    if (!doc) {
      throw new NotFoundError("Hujjat topilmadi");
    }
    return doc;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updateWarehouseDocSchema._type} dto
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async update(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const doc = await this.#requireDraft(tx, id);
      return this.warehouseDocsRepository.update(tx, doc.id, dto);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(auth, id) {
    await withTenant(auth.companyId, auth.userId, async (tx) => {
      const doc = await this.#requireDraft(tx, id);
      await this.warehouseDocsRepository.delete(tx, doc.id);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} docId
   * @param {import("@murcha/shared").createWarehouseDocItemSchema._type} dto
   * @returns {Promise<import("@prisma/client").WarehouseDocItem>}
   */
  async addItem(auth, docId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      await this.#requireDraft(tx, docId);

      const product = await this.productsRepository.findById(tx, dto.productId);
      if (!product || product.deletedAt) {
        throw new NotFoundError("Mahsulot topilmadi");
      }

      const qtyBase = await computeQtyBase(
        tx,
        this.productUnitsRepository,
        product,
        dto.unitId,
        dto.qty,
      );
      const total = dto.price != null ? dto.price * dto.qty : null;

      const item = await this.warehouseDocsRepository.addItem(tx, {
        id: uuidv7(),
        docId,
        productId: dto.productId,
        variantId: dto.variantId ?? null,
        batchId: dto.batchId ?? null,
        unitId: dto.unitId,
        qty: dto.qty,
        qtyBase,
        price: dto.price ?? null,
        total,
      });

      await this.#recalcTotal(tx, docId);
      return item;
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} docId
   * @param {string} itemId
   * @returns {Promise<void>}
   */
  async removeItem(auth, docId, itemId) {
    await withTenant(auth.companyId, auth.userId, async (tx) => {
      await this.#requireDraft(tx, docId);

      const item = await this.warehouseDocsRepository.findItemById(tx, itemId);
      if (!item || item.docId !== docId) {
        throw new NotFoundError("Qator topilmadi");
      }

      await this.warehouseDocsRepository.removeItem(tx, itemId);
      await this.#recalcTotal(tx, docId);
    });
  }

  /**
   * Hujjatni tasdiqlaydi: har qator uchun `Stock`ni turga qarab yangilaydi
   * (kirim +, chiqim/spisaniye -, ko'chirish - chiqish skladidan + kirish
   * skladiga) va immutable `StockMovement` yozuvi qo'shadi. Qulflar
   * deadlock oldini olish uchun `(warehouseId, productId, variantId,
   * batchId)` bo'yicha leksikografik tartibda olinadi (plan hujjati).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} docId
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async confirm(auth, docId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const doc = await this.warehouseDocsRepository.findById(tx, docId);
      if (!doc) {
        throw new NotFoundError("Hujjat topilmadi");
      }
      if (doc.status !== "draft") {
        throw new ConflictError("Faqat qoralama hujjatni tasdiqlash mumkin");
      }
      if (doc.items.length === 0) {
        throw new ValidationError("Hujjatda kamida bitta qator bo'lishi kerak");
      }

      const operations = doc.items.flatMap((item) => this.#buildOperations(doc, item, 1));
      await this.#applyOperations(tx, doc, auth, operations);

      return this.warehouseDocsRepository.update(tx, docId, {
        status: "confirmed",
        confirmedAt: new Date(),
        confirmedBy: auth.userId,
      });
    });
  }

  /**
   * Tasdiqlangan hujjatni bekor qiladi (storno): `confirm()`dagi harakatlarni
   * teskari yo'nalishda qaytaradi (o'sha `docId`ga bog'liq yangi immutable
   * `StockMovement` qatorlari orqali — hujjat/item'ning o'zi o'zgarmaydi),
   * so'ng `status: cancelled` belgilaydi.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} docId
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async cancel(auth, docId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const doc = await this.warehouseDocsRepository.findById(tx, docId);
      if (!doc) {
        throw new NotFoundError("Hujjat topilmadi");
      }
      if (doc.status !== "confirmed") {
        throw new ConflictError("Faqat tasdiqlangan hujjatni bekor qilish mumkin");
      }

      const operations = doc.items.flatMap((item) => this.#buildOperations(doc, item, -1));
      await this.#applyOperations(tx, doc, auth, operations);

      return this.warehouseDocsRepository.update(tx, docId, { status: "cancelled" });
    });
  }

  /**
   * Har operatsiya uchun `Stock`ni yangilaydi (manfiy qoldiqda
   * `InsufficientStockError`) va immutable `StockMovement` yozadi. Qulflar
   * deadlock oldini olish uchun `(warehouseId, productId, variantId,
   * batchId)` bo'yicha leksikografik tartibda olinadi (plan hujjati).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {import("@prisma/client").WarehouseDoc} doc
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {Array<{ warehouseId: string, productId: string, variantId: string | null, batchId: string | null, qty: number, item: import("@prisma/client").WarehouseDocItem }>} operations
   * @returns {Promise<void>}
   */
  async #applyOperations(tx, doc, auth, operations) {
    const ordered = [...operations].sort((a, b) => (this.#lockKey(a) < this.#lockKey(b) ? -1 : 1));

    for (const op of ordered) {
      if (op.qty < 0) {
        const current = await this.stockRepository.findOne(tx, op);
        const available = current ? Number(current.quantity) : 0;
        if (available + op.qty < 0) {
          throw new InsufficientStockError(
            `Skladda yetarli qoldiq yo'q (mahsulot: ${op.productId})`,
          );
        }
      }

      await this.stockRepository.applyDelta(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        warehouseId: op.warehouseId,
        productId: op.productId,
        variantId: op.variantId,
        batchId: op.batchId,
        qtyDelta: op.qty,
      });

      await this.stockMovementsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        warehouseId: op.warehouseId,
        productId: op.productId,
        variantId: op.variantId,
        batchId: op.batchId,
        docType: doc.type,
        docId: doc.id,
        docItemId: op.item.id,
        qty: op.qty,
        costPrice: op.item.price ?? null,
        createdBy: auth.userId,
      });
    }
  }

  /**
   * Hujjat turiga qarab qator nechta va qaysi sklad(lar)ga signed `qty`
   * harakat qilishini hisoblaydi. `direction: -1` — storno (teskari harakat).
   * @param {import("@prisma/client").WarehouseDoc} doc
   * @param {import("@prisma/client").WarehouseDocItem} item
   * @param {1 | -1} direction
   * @returns {Array<{ warehouseId: string, productId: string, variantId: string | null, batchId: string | null, qty: number, item: import("@prisma/client").WarehouseDocItem }>}
   */
  #buildOperations(doc, item, direction) {
    const base = {
      productId: item.productId,
      variantId: item.variantId,
      batchId: item.batchId,
      item,
    };
    const qtyBase = Number(item.qtyBase) * direction;
    switch (doc.type) {
      case "receipt":
        return [{ ...base, warehouseId: doc.warehouseId, qty: qtyBase }];
      case "issue":
      case "writeoff":
        return [{ ...base, warehouseId: doc.warehouseId, qty: -qtyBase }];
      case "transfer":
        return [
          { ...base, warehouseId: doc.warehouseId, qty: -qtyBase },
          { ...base, warehouseId: doc.toWarehouseId, qty: qtyBase },
        ];
      default:
        return [];
    }
  }

  /**
   * @param {{ warehouseId: string, productId: string, variantId: string | null, batchId: string | null }} op
   * @returns {string}
   */
  #lockKey(op) {
    return `${op.warehouseId}|${op.productId}|${op.variantId ?? ""}|${op.batchId ?? ""}`;
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} docId
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async #requireDraft(tx, docId) {
    const doc = await this.warehouseDocsRepository.findById(tx, docId);
    if (!doc) {
      throw new NotFoundError("Hujjat topilmadi");
    }
    if (doc.status !== "draft") {
      throw new ConflictError("Faqat qoralama hujjatni tahrirlash mumkin");
    }
    return doc;
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} docId
   * @returns {Promise<void>}
   */
  async #recalcTotal(tx, docId) {
    const doc = await this.warehouseDocsRepository.findById(tx, docId);
    const total = doc.items.reduce((sum, item) => sum + Number(item.total ?? 0), 0);
    await this.warehouseDocsRepository.update(tx, docId, { total });
  }
}
