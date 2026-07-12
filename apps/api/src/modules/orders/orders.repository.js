/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class OrdersRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data — `items: { create: [...] }` ichida ilova qilinadi
   * @returns {Promise<import("@prisma/client").Order & { items: import("@prisma/client").OrderItem[] }>}
   */
  async create(tx, data) {
    return tx.order.create({ data, include: { items: true } });
  }

  /**
   * `deliveryOrders.delivery` — do'kon UI "kim yetkazyapti"ni bilishi uchun
   * (Faza 7: jonli xaritada `courier:position` oqimini shu
   * `courierMemberId` bo'yicha filtrlaydi).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<(import("@prisma/client").Order & { items: import("@prisma/client").OrderItem[] }) | null>}
   */
  async findById(tx, id) {
    return tx.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        deliveryOrders: { include: { delivery: true } },
      },
    });
  }

  /**
   * Nakladnaya PDF uchun — item'lar mahsulot nomi/artikuli va birlik
   * qisqartmasi bilan (`printing.pdf.js renderOrderInvoicePdf()`).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Order | null>}
   */
  async findByIdForPrint(tx, id) {
    return tx.order.findUnique({
      where: { id },
      include: {
        salePoint: { select: { name: true } },
        items: {
          include: {
            product: { select: { nameUz: true, sku: true } },
            unit: { select: { short: true } },
          },
        },
      },
    });
  }

  /**
   * Idempotency replay — bir xil kalit bilan qayta so'ralsa mavjud zakaz
   * qaytariladi, yangisi yaratilmaydi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {string} idempotencyKey
   * @returns {Promise<(import("@prisma/client").Order & { items: import("@prisma/client").OrderItem[] }) | null>}
   */
  async findByIdempotencyKey(tx, companyId, idempotencyKey) {
    return tx.order.findUnique({
      where: { companyId_idempotencyKey: { companyId, idempotencyKey } },
      include: { items: true },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ status?: string, salePointId?: string, warehouseId?: string }} [filters]
   * @returns {Promise<import("@prisma/client").Order[]>}
   */
  async list(tx, companyId, filters = {}) {
    return tx.order.findMany({
      where: {
        companyId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.salePointId ? { salePointId: filters.salePointId } : {}),
        ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Order>}
   */
  async update(tx, id, data) {
    return tx.order.update({ where: { id }, data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} itemId
   * @param {object} data
   * @returns {Promise<import("@prisma/client").OrderItem>}
   */
  async updateItem(tx, itemId, data) {
    return tx.orderItem.update({ where: { id: itemId }, data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").OrderStatusHistory>}
   */
  async addStatusHistory(tx, data) {
    return tx.orderStatusHistory.create({ data });
  }

  /**
   * Zakaz raqamini oladi — `warehouse-docs`/`purchase-orders`dagi bilan bir
   * xil atomik naqsh (Prisma `upsert`+`{increment}`), `doc_counters`da
   * mustaqil `docType: "order"` ketma-ketligi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {number} year
   * @returns {Promise<number>}
   */
  async nextCounter(tx, companyId, year) {
    const row = await tx.docCounter.upsert({
      where: { companyId_docType_year: { companyId, docType: "order", year } },
      update: { counter: { increment: 1 } },
      create: { companyId, docType: "order", year, counter: 1 },
    });
    return row.counter;
  }
}
