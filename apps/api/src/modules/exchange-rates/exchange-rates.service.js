import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Joriy kurs — avval kompaniya
 * o'z kursi (agar qo'ygan bo'lsa), aks holda `exchangeRateMode:"cbu"`da
 * (default) CBU rasmiy kursi; `"manual"`da CBU'ga qaytilmaydi.
 */
export class ExchangeRatesService {
  /**
   * @param {{
   *   exchangeRatesRepository: import("./exchange-rates.repository.js").ExchangeRatesRepository,
   *   companiesRepository: import("../companies/companies.repository.js").CompaniesRepository,
   * }} deps
   */
  constructor({ exchangeRatesRepository, companiesRepository }) {
    this.exchangeRatesRepository = exchangeRatesRepository;
    this.companiesRepository = companiesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} currency
   * @returns {Promise<{ currency: string, rate: number, rateDate: Date, source: "company" | "cbu" }>}
   */
  async getCurrentRate(auth, currency) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const asOf = new Date();
      const companyRate = await this.exchangeRatesRepository.findLatest(
        tx,
        auth.companyId,
        currency,
        asOf,
      );
      if (companyRate) {
        return {
          currency,
          rate: Number(companyRate.rate),
          rateDate: companyRate.rateDate,
          source: "company",
        };
      }

      const company = await this.companiesRepository.findById(tx, auth.companyId);
      const mode = company?.settings?.exchangeRateMode ?? "cbu";
      if (mode === "manual") {
        throw new NotFoundError(`${currency} kursi belgilanmagan`);
      }

      const officialRate = await this.exchangeRatesRepository.findLatest(tx, null, currency, asOf);
      if (!officialRate) {
        throw new NotFoundError(`${currency} kursi topilmadi`);
      }
      return {
        currency,
        rate: Number(officialRate.rate),
        rateDate: officialRate.rateDate,
        source: "cbu",
      };
    });
  }

  /**
   * Kompaniya o'z kursini qo'yadi (`companies.manage`).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createExchangeRateSchema._type} dto
   * @returns {Promise<import("@prisma/client").ExchangeRate>}
   */
  async setRate(auth, dto) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.exchangeRatesRepository.upsert(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        currency: dto.currency,
        rate: dto.rate,
        rateDate: dto.rateDate ?? new Date(),
      }),
    );
  }
}
