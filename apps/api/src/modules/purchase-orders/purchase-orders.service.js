import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError, ConflictError, ValidationError } from "../../lib/errors.js";
import { computeQtyBase } from "../../lib/qty-base.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). PO CRUD + shu asosida kirim
 * hujjati yaratish. Kirim `warehouse-docs`ning o'z `WarehouseDocsService`si
 * orqali emas, `WarehouseDocsRepository`ning o'zi orqali — bir xil
 * tranzaksiya ichida atomik bo'lishi uchun (bitta `withTenant`, ikkitasi
 * emas). Hujjat `status: draft` yaratiladi — tasdiqlash mavjud
 * `POST /warehouse-docs/:id/confirm` orqali alohida bosqichda.
 */
export class PurchaseOrdersService {
  /**
   * @param {{
   *   purchaseOrdersRepository: import("./purchase-orders.repository.js").PurchaseOrdersRepository,
   *   warehousesRepository: import("../warehouses/warehouses.repository.js").WarehousesRepository,
   *   productsRepository: import("../products/products.repository.js").ProductsRepository,
   *   productUnitsRepository: import("../products/product-units.repository.js").ProductUnitsRepository,
   *   warehouseDocsRepository: import("../warehouse-docs/warehouse-docs.repository.js").WarehouseDocsRepository,
   * }} deps
   */
  constructor({
    purchaseOrdersRepository,
    warehousesRepository,
    productsRepository,
    productUnitsRepository,
    warehouseDocsRepository,
  }) {
    this.purchaseOrdersRepository = purchaseOrdersRepository;
    this.warehousesRepository = warehousesRepository;
    this.productsRepository = productsRepository;
    this.productUnitsRepository = productUnitsRepository;
    this.warehouseDocsRepository = warehouseDocsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createPurchaseOrderSchema._type} dto
   * @returns {Promise<import("@prisma/client").PurchaseOrder>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const warehouse = await this.warehousesRepository.findById(tx, dto.warehouseId);
      if (!warehouse) {
        throw new NotFoundError("Sklad topilmadi");
      }

      const year = new Date().getFullYear();
      const counter = await this.purchaseOrdersRepository.nextCounter(tx, auth.companyId, year);
      const number = `PO-${year}-${String(counter).padStart(5, "0")}`;

      return this.purchaseOrdersRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        number,
        status: "draft",
        expectedAt: dto.expectedAt ?? null,
        currency: dto.currency ?? "UZS",
        exchangeRate: dto.exchangeRate ?? null,
        total: 0,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ status?: string, warehouseId?: string, supplierId?: string }} [filters]
   * @returns {Promise<import("@prisma/client").PurchaseOrder[]>}
   */
  async list(auth, filters) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.purchaseOrdersRepository.list(tx, auth.companyId, filters),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").PurchaseOrder>}
   */
  async getById(auth, id) {
    const po = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.purchaseOrdersRepository.findById(tx, id),
    );
    if (!po) {
      throw new NotFoundError("Zakaz topilmadi");
    }
    return po;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} poId
   * @param {import("@murcha/shared").createPurchaseOrderItemSchema._type} dto
   * @returns {Promise<import("@prisma/client").PurchaseOrderItem>}
   */
  async addItem(auth, poId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      await this.#requireDraft(tx, poId);

      const product = await this.productsRepository.findById(tx, dto.productId);
      if (!product || product.deletedAt) {
        throw new NotFoundError("Mahsulot topilmadi");
      }

      const item = await this.purchaseOrdersRepository.addItem(tx, {
        id: uuidv7(),
        purchaseOrderId: poId,
        productId: dto.productId,
        unitId: dto.unitId,
        qty: dto.qty,
        qtyReceived: 0,
        price: dto.price,
      });

      await this.#recalcTotal(tx, poId);
      return item;
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} poId
   * @param {string} itemId
   * @returns {Promise<void>}
   */
  async removeItem(auth, poId, itemId) {
    await withTenant(auth.companyId, auth.userId, async (tx) => {
      await this.#requireDraft(tx, poId);

      const item = await this.purchaseOrdersRepository.findItemById(tx, itemId);
      if (!item || item.purchaseOrderId !== poId) {
        throw new NotFoundError("Qator topilmadi");
      }

      await this.purchaseOrdersRepository.removeItem(tx, itemId);
      await this.#recalcTotal(tx, poId);
    });
  }

  /**
   * PO asosida kirim: yangi `warehouse_docs` (`type: "receipt"`,
   * `status: "draft"`) + item'lar yaratadi, har item uchun
   * `PurchaseOrderItem.qtyReceived`ni oshiradi, PO statusini
   * (`partially_received`/`received`) yangilaydi. Hujjatni tasdiqlash
   * (`stock` yangilanishi) alohida — mavjud `confirm()` orqali.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} poId
   * @param {import("@murcha/shared").receivePurchaseOrderSchema._type} dto
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async receive(auth, poId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const po = await this.purchaseOrdersRepository.findById(tx, poId);
      if (!po) {
        throw new NotFoundError("Zakaz topilmadi");
      }
      if (po.status === "received" || po.status === "cancelled") {
        throw new ConflictError("Bu zakaz bo'yicha endi kirim qilib bo'lmaydi");
      }

      const poItemsById = new Map(po.items.map((item) => [item.id, item]));
      for (const line of dto.items) {
        const poItem = poItemsById.get(line.poItemId);
        if (!poItem || poItem.purchaseOrderId !== poId) {
          throw new NotFoundError(`Zakaz qatori topilmadi: ${line.poItemId}`);
        }
        const remaining = Number(poItem.qty) - Number(poItem.qtyReceived);
        if (line.qty > remaining) {
          throw new ValidationError(
            `Qoldiq miqdordan ko'p kiritilmoqda (qolgan: ${remaining}, kiritilgan: ${line.qty})`,
          );
        }
      }

      const year = new Date().getFullYear();
      const counter = await this.warehouseDocsRepository.nextCounter(
        tx,
        auth.companyId,
        "receipt",
        year,
      );
      const number = `KIR-${year}-${String(counter).padStart(5, "0")}`;

      const doc = await this.warehouseDocsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        type: "receipt",
        number,
        warehouseId: po.warehouseId,
        counterpartyId: po.supplierId,
        purchaseOrderId: po.id,
        status: "draft",
        currency: po.currency,
        exchangeRate: po.exchangeRate,
        total: 0,
        createdBy: auth.userId,
      });

      let docTotal = 0;
      for (const line of dto.items) {
        const poItem = poItemsById.get(line.poItemId);
        const product = await this.productsRepository.findById(tx, poItem.productId);
        const qtyBase = await computeQtyBase(
          tx,
          this.productUnitsRepository,
          product,
          poItem.unitId,
          line.qty,
        );
        const total = Number(poItem.price) * line.qty;
        docTotal += total;

        await this.warehouseDocsRepository.addItem(tx, {
          id: uuidv7(),
          docId: doc.id,
          productId: poItem.productId,
          variantId: null,
          batchId: null,
          unitId: poItem.unitId,
          qty: line.qty,
          qtyBase,
          price: poItem.price,
          total,
        });

        await this.purchaseOrdersRepository.incrementReceived(tx, poItem.id, line.qty);
      }

      await this.warehouseDocsRepository.update(tx, doc.id, { total: docTotal });

      const refreshed = await this.purchaseOrdersRepository.findById(tx, poId);
      const fullyReceived = refreshed.items.every(
        (item) => Number(item.qtyReceived) >= Number(item.qty),
      );
      await this.purchaseOrdersRepository.update(tx, poId, {
        status: fullyReceived ? "received" : "partially_received",
      });

      return this.warehouseDocsRepository.findById(tx, doc.id);
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} poId
   * @returns {Promise<import("@prisma/client").PurchaseOrder>}
   */
  async #requireDraft(tx, poId) {
    const po = await this.purchaseOrdersRepository.findById(tx, poId);
    if (!po) {
      throw new NotFoundError("Zakaz topilmadi");
    }
    if (po.status !== "draft") {
      throw new ConflictError("Faqat qoralama zakazni tahrirlash mumkin");
    }
    return po;
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} poId
   * @returns {Promise<void>}
   */
  async #recalcTotal(tx, poId) {
    const po = await this.purchaseOrdersRepository.findById(tx, poId);
    const total = po.items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);
    await this.purchaseOrdersRepository.update(tx, poId, { total });
  }
}
