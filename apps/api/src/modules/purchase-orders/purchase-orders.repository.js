/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class PurchaseOrdersRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").PurchaseOrder>}
   */
  async create(tx, data) {
    return tx.purchaseOrder.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<(import("@prisma/client").PurchaseOrder & { items: import("@prisma/client").PurchaseOrderItem[] }) | null>}
   */
  async findById(tx, id) {
    return tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ status?: string, warehouseId?: string, supplierId?: string }} [filters]
   * @returns {Promise<import("@prisma/client").PurchaseOrder[]>}
   */
  async list(tx, companyId, filters = {}) {
    return tx.purchaseOrder.findMany({
      where: {
        companyId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").PurchaseOrder>}
   */
  async update(tx, id, data) {
    return tx.purchaseOrder.update({ where: { id }, data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").PurchaseOrderItem>}
   */
  async addItem(tx, data) {
    return tx.purchaseOrderItem.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} itemId
   * @returns {Promise<import("@prisma/client").PurchaseOrderItem | null>}
   */
  async findItemById(tx, itemId) {
    return tx.purchaseOrderItem.findUnique({ where: { id: itemId } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} itemId
   * @returns {Promise<void>}
   */
  async removeItem(tx, itemId) {
    await tx.purchaseOrderItem.delete({ where: { id: itemId } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} itemId
   * @param {number} qtyDelta
   * @returns {Promise<import("@prisma/client").PurchaseOrderItem>}
   */
  async incrementReceived(tx, itemId, qtyDelta) {
    return tx.purchaseOrderItem.update({
      where: { id: itemId },
      data: { qtyReceived: { increment: qtyDelta } },
    });
  }

  /**
   * PO raqamini oladi — `warehouse-docs`dagi bilan bir xil atomik naqsh
   * (Prisma `upsert`+`{increment}` → Postgres `INSERT...ON CONFLICT`),
   * `doc_counters`da mustaqil `docType: "purchase_order"` ketma-ketligi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {number} year
   * @returns {Promise<number>}
   */
  async nextCounter(tx, companyId, year) {
    const row = await tx.docCounter.upsert({
      where: { companyId_docType_year: { companyId, docType: "purchase_order", year } },
      update: { counter: { increment: 1 } },
      create: { companyId, docType: "purchase_order", year, counter: 1 },
    });
    return row.counter;
  }
}
