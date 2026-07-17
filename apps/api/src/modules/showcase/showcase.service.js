import { uuidv7 } from "uuidv7";
import { withBypass, withTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";
import { minioClient, MINIO_BUCKET } from "../../lib/minio.js";
import { domainEvents } from "../../lib/events.js";

const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Autentifikatsiyasiz — kompaniya
 * `slug` orqali topiladi, ya'ni `company_id` so'rov BOSHIDA noma'lum.
 *
 * Ikki bosqichli kontekst (Faza 13, RLS `FORCE` qilingandan keyin):
 *   1. `withBypass` — FAQAT slug bo'yicha kompaniya qidirish. `companies`
 *      RLS bilan himoyalangan va bu yerda kontekst tanlab bo'lmaydi.
 *   2. `withTenant(company.id)` — katalog o'qish / lid yozish. Ochiq
 *      (autentifikatsiyasiz) endpoint bypass client'da TURMAYDI: kompaniya
 *      aniqlangach RLS himoyasi qayta yoqiladi.
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
   * Yagona bypass yo'li — qamrovi ataylab tor: bitta `companies` qatori.
   * Qolgan hamma ish `withTenant(company.id)` ichida bajariladi.
   * @param {string} slug
   * @returns {Promise<import("@prisma/client").Company>}
   */
  async #findEnabledCompany(slug) {
    const company = await withBypass((tx) => this.companiesRepository.findBySlug(tx, slug));
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
    const company = await this.#findEnabledCompany(slug);

    // DB o'qishlar — tranzaksiya ICHIDA, hammasi batch (`{in: [...]}`,
    // N+1 emas). MinIO presign (tarmoq I/O) tranzaksiyadan TASHQARIDA,
    // parallel — aks holda ko'p mahsulotli katalogda ketma-ket MinIO
    // so'rovlari Prisma interaktiv tranzaksiyaning standart muddatidan (5s)
    // oshib, butun ochiq (autentifikatsiyasiz) sahifani P2028 bilan
    // yiqitishi mumkin edi.
    const catalogDraft = await withTenant(company.id, null, async (tx) => {
      const foundCompany = company;
      const settings = foundCompany.showcaseSettings;

      const priceTypes = await this.priceTypesRepository.list(tx, foundCompany.id);
      const priceTypeId = settings.priceTypeId ?? priceTypes.find((p) => p.isDefault)?.id ?? null;

      const draft = [];
      if (priceTypeId) {
        const products = await this.productsRepository.list(tx, foundCompany.id, {
          categoryId: settings.categoryId ?? undefined,
        });
        const activeProducts = products.filter((p) => p.status === "active");
        const productIds = activeProducts.map((p) => p.id);
        const now = new Date();

        const [prices, images] = await Promise.all([
          this.productPricesRepository.listCurrentByProducts(tx, productIds, now),
          this.productImagesRepository.listByProducts(tx, productIds),
        ]);

        const priceByProduct = new Map();
        for (const price of prices) {
          if (price.priceTypeId === priceTypeId) priceByProduct.set(price.productId, price);
        }
        // `images` `productId` bo'yicha guruhlangan, har guruh ichida
        // `isMain` birinchi (`listByProducts()`) — birinchi uchragan
        // qator shu mahsulotning asosiy rasmi.
        const imageByProduct = new Map();
        for (const image of images) {
          if (!imageByProduct.has(image.productId)) imageByProduct.set(image.productId, image);
        }

        for (const product of activeProducts) {
          const priceRow = priceByProduct.get(product.id);
          if (!priceRow) continue;
          const image = imageByProduct.get(product.id) ?? null;
          draft.push({
            id: product.id,
            nameUz: product.nameUz,
            nameRu: product.nameRu,
            price: Number(priceRow.price),
            currency: priceRow.currency,
            imagePath: image ? (image.thumbPath ?? image.path) : null,
          });
        }
      }

      return draft;
    });

    const [catalog, logoUrl] = await Promise.all([
      Promise.all(
        catalogDraft.map(async ({ imagePath, ...item }) => ({
          ...item,
          imageUrl: imagePath
            ? await minioClient.presignedGetObject(
                MINIO_BUCKET,
                imagePath,
                PRESIGNED_URL_TTL_SECONDS,
              )
            : null,
        })),
      ),
      company.logoPath
        ? minioClient.presignedGetObject(MINIO_BUCKET, company.logoPath, PRESIGNED_URL_TTL_SECONDS)
        : null,
    ]);

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
  }

  /**
   * @param {string} slug
   * @param {import("@murcha/shared").createLeadSchema._type} dto
   * @returns {Promise<import("@prisma/client").Lead>}
   */
  async createLead(slug, dto) {
    const company = await this.#findEnabledCompany(slug);

    const lead = await withTenant(company.id, null, async (tx) => {
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
