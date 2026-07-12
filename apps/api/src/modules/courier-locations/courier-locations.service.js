import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";

const RETENTION_DAYS = 30;

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Faqat Socket.IO orqali
 * chaqiriladi (`lib/socket.js`), REST route yo'q. `record()` GPS
 * koordinatani yozadi va **shu tranzaksiyada** shu kompaniya doirasida
 * 30 kundan eski yozuvlarni tozalaydi — global BullMQ cron o'rniga
 * (`rls.sql`: cross-tenant RLS-bypass roli Faza 11'gacha yo'q).
 */
export class CourierLocationsService {
  /**
   * @param {{
   *   courierLocationsRepository: import("./courier-locations.repository.js").CourierLocationsRepository,
   *   companyMembersRepository: import("../companies/company-members.repository.js").CompanyMembersRepository,
   * }} deps
   */
  constructor({ courierLocationsRepository, companyMembersRepository }) {
    this.courierLocationsRepository = courierLocationsRepository;
    this.companyMembersRepository = companyMembersRepository;
  }

  /**
   * @param {{ userId: string, companyId: string }} auth
   * @param {{ lat: number, lng: number }} coords
   * @returns {Promise<{ courierMemberId: string, lat: import("@prisma/client/runtime/library").Decimal, lng: import("@prisma/client/runtime/library").Decimal, recordedAt: Date } | null>}
   */
  async record(auth, coords) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const member = await this.companyMembersRepository.findByCompanyAndUser(
        tx,
        auth.companyId,
        auth.userId,
      );
      if (!member) {
        return null;
      }

      const location = await this.courierLocationsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        courierMemberId: member.id,
        lat: coords.lat,
        lng: coords.lng,
        recordedAt: new Date(),
      });

      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
      await this.courierLocationsRepository.deleteOlderThan(tx, auth.companyId, cutoff);

      return {
        courierMemberId: member.id,
        lat: location.lat,
        lng: location.lng,
        recordedAt: location.recordedAt,
      };
    });
  }
}
