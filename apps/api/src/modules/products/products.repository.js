/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class ProductsRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Product>}
   */
  async create(tx, data) {
    return tx.product.create({ data });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Product | null>}
   */
  async findById(tx, id) {
    return tx.product.findUnique({ where: { id } });
  }

  /**
   * SKU noyobligini ilova darajasida tekshirish uchun (RLS tufayli joriy
   * kompaniya doirasida qidiradi — `@@unique([companyId, sku])`).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} sku
   * @returns {Promise<import("@prisma/client").Product | null>}
   */
  async findBySku(tx, sku) {
    return tx.product.findFirst({ where: { sku } });
  }

  /**
   * O'chirilmagan mahsulotlar ro'yxati (`deletedAt: null`). `search` — nom
   * bo'yicha case-insensitive qidiruv (`ILIKE '%so'z%'`ga compile bo'ladi,
   * `prisma/search.sql`dagi trigram GIN indeks shu so'rovni tezlashtiradi).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} companyId
   * @param {{ search?: string, categoryId?: string }} [filters]
   * @returns {Promise<import("@prisma/client").Product[]>}
   */
  async list(tx, companyId, filters = {}) {
    return tx.product.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(filters.search ? { nameUz: { contains: filters.search, mode: "insensitive" } } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      },
      include: {
        category: { select: { id: true, nameUz: true } },
        baseUnit: { select: { id: true, short: true } },
      },
      orderBy: { nameUz: "asc" },
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string} id
   * @param {object} data
   * @returns {Promise<import("@prisma/client").Product>}
   */
  async update(tx, id, data) {
    return tx.product.update({ where: { id }, data });
  }
}
