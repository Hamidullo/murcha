/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). `product_images` — RLS'ga
 * ega emas (bola-jadval, `company_id` ustuni yo'q, ota `products` orqali
 * izolyatsiya qilinadi — rls.sql). Fayl (S3/MinIO) tarkibi bu yerda emas —
 * faqat `path`/`thumb_path` (obyekt kaliti) saqlanadi.
 */
export class ProductImagesRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").ProductImage>}
   */
  async create(tx, data) {
    return tx.productImage.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").ProductImage | null>}
   */
  async findById(tx, id) {
    return tx.productImage.findUnique({ where: { id } });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductImage[]>}
   */
  async list(tx, productId) {
    return tx.productImage.findMany({
      where: { productId },
      orderBy: [{ isMain: "desc" }, { sort: "asc" }],
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").ProductImage>}
   */
  async update(tx, id, data) {
    return tx.productImage.update({ where: { id }, data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(tx, id) {
    await tx.productImage.delete({ where: { id } });
  }

  /**
   * Bitta mahsulotda faqat bitta rasm `isMain:true` bo'lishi kerak.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} productId
   * @param {string | null} excludeId
   * @returns {Promise<void>}
   */
  async unsetMain(tx, productId, excludeId) {
    await tx.productImage.updateMany({
      where: { productId, isMain: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
      data: { isMain: false },
    });
  }
}
