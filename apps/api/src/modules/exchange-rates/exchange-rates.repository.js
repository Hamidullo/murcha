/** Faqat DB so'rovlari (CLAUDE.md qatlam qoidasi). */
export class ExchangeRatesRepository {
  /**
   * `companyId:null` = CBU rasmiy kurs.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {string | null} companyId
   * @param {string} currency
   * @param {Date} asOf
   * @returns {Promise<import("@prisma/client").ExchangeRate | null>}
   */
  async findLatest(tx, companyId, currency, asOf) {
    return tx.exchangeRate.findFirst({
      where: { companyId, currency, rateDate: { lte: asOf } },
      orderBy: { rateDate: "desc" },
    });
  }

  /**
   * Shu kun uchun kurs allaqachon bo'lsa yangilaydi (bir kunga bitta yozuv —
   * `@@unique([companyId, currency, rateDate])`).
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ id: string, companyId: string | null, currency: string, rate: number, rateDate: Date }} data
   * @returns {Promise<import("@prisma/client").ExchangeRate>}
   */
  async upsert(tx, data) {
    return tx.exchangeRate.upsert({
      where: {
        companyId_currency_rateDate: {
          companyId: data.companyId,
          currency: data.currency,
          rateDate: data.rateDate,
        },
      },
      create: data,
      update: { rate: data.rate },
    });
  }
}
