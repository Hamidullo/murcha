/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class InventoryCountsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").InventoryCount>}
   */
  async create(tx, data) {
    return tx.inventoryCount.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<(import("@prisma/client").InventoryCount & { items: import("@prisma/client").InventoryCountItem[] }) | null>}
   */
  async findById(tx, id) {
    return tx.inventoryCount.findUnique({ where: { id }, include: { items: true } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ warehouseId?: string, status?: string }} [filters]
   * @returns {Promise<import("@prisma/client").InventoryCount[]>}
   */
  async list(tx, companyId, filters = {}) {
    return tx.inventoryCount.findMany({
      where: {
        companyId,
        ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").InventoryCount>}
   */
  async update(tx, id, data) {
    return tx.inventoryCount.update({ where: { id }, data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").InventoryCountItem>}
   */
  async createItem(tx, data) {
    return tx.inventoryCountItem.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} itemId
   * @returns {Promise<import("@prisma/client").InventoryCountItem | null>}
   */
  async findItemById(tx, itemId) {
    return tx.inventoryCountItem.findUnique({ where: { id: itemId } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} itemId
   * @param {object} data
   * @returns {Promise<import("@prisma/client").InventoryCountItem>}
   */
  async updateItem(tx, itemId, data) {
    return tx.inventoryCountItem.update({ where: { id: itemId }, data });
  }
}
