/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). `product_barcodes` — RLS ostida (`company_id`). */
export class ProductBarcodesRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string, productId: string, unitId?: string | null, barcode: string }} data
   * @returns {Promise<import("@prisma/client").ProductBarcode>}
   */
  async create(tx, data) {
    return tx.productBarcode.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").ProductBarcode | null>}
   */
  async findById(tx, id) {
    return tx.productBarcode.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} barcode
   * @returns {Promise<import("@prisma/client").ProductBarcode | null>}
   */
  async findByBarcode(tx, barcode) {
    return tx.productBarcode.findFirst({ where: { barcode } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductBarcode[]>}
   */
  async list(tx, productId) {
    return tx.productBarcode.findMany({ where: { productId } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(tx, id) {
    await tx.productBarcode.delete({ where: { id } });
  }
}
