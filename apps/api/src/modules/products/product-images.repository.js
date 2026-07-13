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
   * `list()`ning ko'p mahsulotli varianti — N ta alohida so'rov o'rniga
   * bitta `findMany` (`showcase.service.js` kabi ko'p mahsulotli
   * ro'yxatlarda N+1'ning oldini olish uchun). Har mahsulot ichida tartib
   * `list()`dagi bilan bir xil (`isMain` birinchi) — chaqiruvchi har
   * `productId` uchun ro'yxatdagi birinchi qatorni "asosiy rasm" sifatida
   * oladi.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string[]} productIds
   * @returns {Promise<import("@prisma/client").ProductImage[]>}
   */
  async listByProducts(tx, productIds) {
    if (productIds.length === 0) return [];
    return tx.productImage.findMany({
      where: { productId: { in: productIds } },
      orderBy: [{ productId: "asc" }, { isMain: "desc" }, { sort: "asc" }],
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
