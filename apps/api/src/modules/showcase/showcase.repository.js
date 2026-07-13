/**
 * Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). Kompaniya/mahsulot/narx
 * o'qishlari mavjud `companies`/`products`/`product-prices`/`product-images`/
 * `price-types` repositorylaridan qayta ishlatiladi (`showcase.service.js`),
 * bu yerda faqat vitrinaga xos yozuv — lid yaratish.
 */
export class ShowcaseRepository {
  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string, name: string, phone: string, message: string | null, items: unknown }} data
   * @returns {Promise<import("@prisma/client").Lead>}
   */
  async createLead(tx, data) {
    return tx.lead.create({ data });
  }
}
