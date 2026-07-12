import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";
import { minioClient, MINIO_BUCKET } from "../../lib/minio.js";

const EXTENSION_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Kompaniya brendingi (logo,
 * brend rangi) va sozlamalar (`settings` — `creditLimitMode`/
 * `exchangeRateMode`, Faza 8/9'da o'qilgan, bu yerda birinchi marta
 * yoziladi). `updateMe()` `settings`ni butunlay almashtirmaydi — mavjud
 * kalitlar bilan birlashtiradi (`{...existing, ...dto.settings}`), aks
 * holda faqat brend rangini o'zgartirish `creditLimitMode`ni tozalab
 * qo'ygan bo'lardi.
 */
export class CompaniesService {
  /**
   * @param {{ companiesRepository: import("./companies.repository.js").CompaniesRepository }} deps
   */
  constructor({ companiesRepository }) {
    this.companiesRepository = companiesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").Company>}
   */
  async getMe(auth) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const company = await this.companiesRepository.findById(tx, auth.companyId);
      if (!company) {
        throw new NotFoundError("Kompaniya topilmadi");
      }
      return company;
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").updateCompanySchema._type} dto
   * @returns {Promise<import("@prisma/client").Company>}
   */
  async updateMe(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.companiesRepository.findById(tx, auth.companyId);
      if (!existing) {
        throw new NotFoundError("Kompaniya topilmadi");
      }
      const data = { ...dto };
      if (dto.settings) {
        data.settings = { ...existing.settings, ...dto.settings };
      }
      return this.companiesRepository.update(tx, auth.companyId, data);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ buffer: Buffer, size: number, mimetype: string }} file
   * @returns {Promise<import("@prisma/client").Company>}
   */
  async uploadLogo(auth, file) {
    const existing = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.companiesRepository.findById(tx, auth.companyId),
    );
    if (!existing) {
      throw new NotFoundError("Kompaniya topilmadi");
    }

    const extension = EXTENSION_BY_MIME[file.mimetype] ?? "jpg";
    const path = `companies/${auth.companyId}/logo.${extension}`;
    await minioClient.putObject(MINIO_BUCKET, path, file.buffer, file.size, {
      "Content-Type": file.mimetype,
    });

    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.companiesRepository.update(tx, auth.companyId, { logoPath: path }),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<{ url: string | null }>}
   */
  async getLogoUrl(auth) {
    const company = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.companiesRepository.findById(tx, auth.companyId),
    );
    if (!company) {
      throw new NotFoundError("Kompaniya topilmadi");
    }
    if (!company.logoPath) {
      return { url: null };
    }
    const url = await minioClient.presignedGetObject(
      MINIO_BUCKET,
      company.logoPath,
      PRESIGNED_URL_TTL_SECONDS,
    );
    return { url };
  }
}
