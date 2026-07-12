/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class WarehouseDocsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async create(tx, data) {
    return tx.warehouseDoc.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<(import("@prisma/client").WarehouseDoc & { items: import("@prisma/client").WarehouseDocItem[] }) | null>}
   */
  async findById(tx, id) {
    return tx.warehouseDoc.findUnique({ where: { id }, include: { items: true } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ type?: string, status?: string, warehouseId?: string }} [filters]
   * @returns {Promise<import("@prisma/client").WarehouseDoc[]>}
   */
  async list(tx, companyId, filters = {}) {
    return tx.warehouseDoc.findMany({
      where: {
        companyId,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").WarehouseDoc>}
   */
  async update(tx, id, data) {
    return tx.warehouseDoc.update({ where: { id }, data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(tx, id) {
    await tx.warehouseDoc.delete({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").WarehouseDocItem>}
   */
  async addItem(tx, data) {
    return tx.warehouseDocItem.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} itemId
   * @returns {Promise<import("@prisma/client").WarehouseDocItem | null>}
   */
  async findItemById(tx, itemId) {
    return tx.warehouseDocItem.findUnique({ where: { id: itemId } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} itemId
   * @returns {Promise<void>}
   */
  async removeItem(tx, itemId) {
    await tx.warehouseDocItem.delete({ where: { id: itemId } });
  }

  /**
   * Hujjat raqamini oladi — `INSERT ... ON CONFLICT DO UPDATE` orqali atomik
   * o'sadi (Prisma `upsert` Postgres'da bitta statement, race yo'q).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {string} docType
   * @param {number} year
   * @returns {Promise<number>}
   */
  async nextCounter(tx, companyId, docType, year) {
    const row = await tx.docCounter.upsert({
      where: { companyId_docType_year: { companyId, docType, year } },
      update: { counter: { increment: 1 } },
      create: { companyId, docType, year, counter: 1 },
    });
    return row.counter;
  }
}
