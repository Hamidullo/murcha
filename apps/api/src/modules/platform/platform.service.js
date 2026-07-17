import { uuidv7 } from "uuidv7";
import { withBypass } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). `platform-auth`dan tashqari —
 * `requirePlatformAdmin` middleware'i orqasida, `req.platformAuth`ni oladi
 * (companyId yo'q, funksiyalar shuning uchun `auth` emas, faqat parametr
 * qabul qiladi). Cross-tenant o'qish `withBypass` orqali (`lib/tenant-context.js`).
 */
export class PlatformService {
  /**
   * @param {{
   *   platformRepository: import("./platform.repository.js").PlatformRepository,
   * }} deps
   */
  constructor({ platformRepository }) {
    this.platformRepository = platformRepository;
  }

  /**
   * @param {import("@murcha/shared").listCompaniesQuerySchema._type} [filters]
   * @returns {Promise<Array<import("@prisma/client").Company & { subscription: import("@prisma/client").Subscription | null }>>}
   */
  async listCompanies(filters) {
    return withBypass((tx) => this.platformRepository.listCompanies(tx, filters));
  }

  /**
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Company & { subscription: import("@prisma/client").Subscription | null }>}
   */
  async getCompany(id) {
    const company = await withBypass((tx) => this.platformRepository.getCompany(tx, id));
    if (!company) {
      throw new NotFoundError("Kompaniya topilmadi");
    }
    return company;
  }

  /**
   * @param {string} companyId
   * @param {import("@murcha/shared").updateSubscriptionSchema._type} dto
   * @returns {Promise<import("@prisma/client").Subscription>}
   */
  async updateSubscription(companyId, dto) {
    return withBypass(async (tx) => {
      const company = await this.platformRepository.getCompany(tx, companyId);
      if (!company) {
        throw new NotFoundError("Kompaniya topilmadi");
      }
      return this.platformRepository.upsertSubscription(tx, companyId, {
        id: uuidv7(),
        ...dto,
      });
    });
  }
}
