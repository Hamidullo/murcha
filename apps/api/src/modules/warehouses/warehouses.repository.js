/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class WarehousesRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string, name: string, address?: string, lat?: number, lng?: number }} data
   * @returns {Promise<import("@prisma/client").Warehouse>}
   */
  async create(tx, data) {
    return tx.warehouse.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Warehouse | null>}
   */
  async findById(tx, id) {
    return tx.warehouse.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @returns {Promise<import("@prisma/client").Warehouse[]>}
   */
  async list(tx, companyId) {
    return tx.warehouse.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Warehouse>}
   */
  async update(tx, id, data) {
    return tx.warehouse.update({ where: { id }, data });
  }
}
