import { uuidv7 } from "uuidv7";
import { withoutTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";
import { minioClient, MINIO_BUCKET } from "../../lib/minio.js";
import { domainEvents } from "../../lib/events.js";

const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Autentifikatsiyasiz — kompaniya
 * `slug` orqali topiladi, `withoutTenant` (`lib/tenant-context.js`, login'ning
 * boshlang'ich telefon-qidiruvi bilan bir xil "hali company_id noma'lum"
 * naqshi) + har so'rovda qo'lda `companyId` filtri. Mavjud
 * `products`/`product-prices`/`product-images`/`price-types` repositorylari
 * `companyId`ni to'g'ridan-to'g'ri `where`da qabul qiladi (RLS session
 * o'zgaruvchisiga tayanmaydi) — shu sababli `withoutTenant` tx bilan
 * xavfsiz qayta ishlatiladi (`ShopCatalogService`dagi bilan bir xil
 * repository-only aggregatsiya qolipi).
 */
export class ShowcaseService {
  /**
   * @param {{
   *   companiesRepository: import("../companies/companies.repository.js").CompaniesRepository,
   *   productsRepository: import("../products/products.repository.js").ProductsRepository,
   *   productPricesRepository: import("../products/product-prices.repository.js").ProductPricesRepository,
   *   productImagesRepository: import("../products/product-images.repository.js").ProductImagesRepository,
   *   priceTypesRepository: import("../price-types/price-types.repository.js").PriceTypesRepository,
   *   showcaseRepository: import("./showcase.repository.js").ShowcaseRepository,
   * }} deps
   */
  constructor({
    companiesRepository,
    productsRepository,
    productPricesRepository,
    productImagesRepository,
    priceTypesRepository,
    showcaseRepository,
  }) {
    this.companiesRepository = companiesRepository;
    this.productsRepository = productsRepository;
    this.productPricesRepository = productPricesRepository;
    this.productImagesRepository = productImagesRepository;
    this.priceTypesRepository = priceTypesRepository;
    this.showcaseRepository = showcaseRepository;
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} txClient
   * @param {string} slug
   * @returns {Promise<import("@prisma/client").Company>}
   */
  async #findEnabledCompany(txClient, slug) {
    const company = await this.companiesRepository.findBySlug(txClient, slug);
    if (!company || !company.showcaseSettings?.enabled) {
      throw new NotFoundError("Vitrina topilmadi");
    }
    return company;
  }

  /**
   * @param {string} slug
   * @returns {Promise<{
   *   company: { id: string, name: string, slug: string, brandColor: string | null, logoUrl: string | null },
   *   catalog: Array<{ id: string, nameUz: string, nameRu: string | null, price: number, currency: string, imageUrl: string | null }>,
   * }>}
   */
  async getShowcase(slug) {
    return withoutTenant(async (tx) => {
      const company = await this.#findEnabledCompany(tx, slug);
      const settings = company.showcaseSettings;

      const priceTypes = await this.priceTypesRepository.list(tx, company.id);
      const priceTypeId = settings.priceTypeId ?? priceTypes.find((p) => p.isDefault)?.id ?? null;

      const catalog = [];
      if (priceTypeId) {
        const products = await this.productsRepository.list(tx, company.id, {
          categoryId: settings.categoryId ?? undefined,
        });
        const now = new Date();
        for (const product of products.filter((p) => p.status === "active")) {
          const prices = await this.productPricesRepository.listCurrentByProduct(
            tx,
            product.id,
            now,
          );
          const priceRow = prices.find((p) => p.priceTypeId === priceTypeId);
          if (!priceRow) continue;

          const images = await this.productImagesRepository.list(tx, product.id);
          const main = images.find((img) => img.isMain) ?? images[0] ?? null;
          const imageUrl = main
            ? await minioClient.presignedGetObject(
                MINIO_BUCKET,
                main.thumbPath ?? main.path,
                PRESIGNED_URL_TTL_SECONDS,
              )
            : null;

          catalog.push({
            id: product.id,
            nameUz: product.nameUz,
            nameRu: product.nameRu,
            price: Number(priceRow.price),
            currency: priceRow.currency,
            imageUrl,
          });
        }
      }

      const logoUrl = company.logoPath
        ? await minioClient.presignedGetObject(
            MINIO_BUCKET,
            company.logoPath,
            PRESIGNED_URL_TTL_SECONDS,
          )
        : null;

      return {
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          brandColor: company.brandColor,
          logoUrl,
        },
        catalog,
      };
    });
  }

  /**
   * @param {string} slug
   * @param {import("@murcha/shared").createLeadSchema._type} dto
   * @returns {Promise<import("@prisma/client").Lead>}
   */
  async createLead(slug, dto) {
    const lead = await withoutTenant(async (tx) => {
      const company = await this.#findEnabledCompany(tx, slug);
      return this.showcaseRepository.createLead(tx, {
        id: uuidv7(),
        companyId: company.id,
        name: dto.name,
        phone: dto.phone,
        message: dto.message ?? null,
        items: dto.items ?? null,
      });
    });

    // Tranzaksiyadan tashqarida (orders.service.js create()dagi "order.new"
    // bilan bir xil naqsh — bitta operatsiya = bitta tranzaksiya qoidasi).
    domainEvents.emit("lead.new", {
      companyId: lead.companyId,
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
    });

    return lead;
  }
}
