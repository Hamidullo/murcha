import { withTenant } from "../../lib/tenant-context.js";
import { ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { convertToUzs, resolveExchangeRate } from "../../lib/currency.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Faqat o'qish — o'z jadvali yo'q,
 * mavjud `products`/`product-prices`/`stock`/`sale-points`/`user-assignments`
 * repositorylarini birlashtiradi (`exports` modulidagi bilan bir xil
 * repository-only aggregatsiya qolipi — alohida `.repository.js` shart
 * emas). Do'kon operatori uchun narx sotuv nuqtasining `priceTypeId`si
 * bo'yicha, qoldiq (agar `warehouseId` berilsa) `quantity - reserved`.
 * USD narxli mahsulot — joriy kurs bilan UZS'ga o'girib ko'rsatiladi (do'kon
 * operatori sotib olganda aynan shu summani to'laydi, `orders.service.js`
 * `create()`dagi bilan bir xil naqsh).
 */
export class ShopCatalogService {
  /**
   * @param {{
   *   productsRepository: import("../products/products.repository.js").ProductsRepository,
   *   productPricesRepository: import("../products/product-prices.repository.js").ProductPricesRepository,
   *   salePointsRepository: import("../sale-points/sale-points.repository.js").SalePointsRepository,
   *   userAssignmentsRepository: import("../user-assignments/user-assignments.repository.js").UserAssignmentsRepository,
   *   stockRepository: import("../stock/stock.repository.js").StockRepository,
   *   companiesRepository: import("../companies/companies.repository.js").CompaniesRepository,
   *   exchangeRatesRepository: import("../exchange-rates/exchange-rates.repository.js").ExchangeRatesRepository,
   * }} deps
   */
  constructor({
    productsRepository,
    productPricesRepository,
    salePointsRepository,
    userAssignmentsRepository,
    stockRepository,
    companiesRepository,
    exchangeRatesRepository,
  }) {
    this.productsRepository = productsRepository;
    this.productPricesRepository = productPricesRepository;
    this.salePointsRepository = salePointsRepository;
    this.userAssignmentsRepository = userAssignmentsRepository;
    this.stockRepository = stockRepository;
    this.companiesRepository = companiesRepository;
    this.exchangeRatesRepository = exchangeRatesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").listShopCatalogQuerySchema._type} [filters]
   * @returns {Promise<Array<{ productId: string, sku: string, nameUz: string, categoryId: string | null, baseUnitId: string, price: number, currency: string, availableQty: number | null }>>}
   */
  async list(auth, filters = {}) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const salePointId = await this.userAssignmentsRepository.findSalePointIdForUser(
        tx,
        auth.companyId,
        auth.userId,
      );
      if (!salePointId) {
        throw new ForbiddenError("Foydalanuvchi hech qanday sotuv nuqtasiga biriktirilmagan");
      }
      const salePoint = await this.salePointsRepository.findById(tx, salePointId);
      if (!salePoint) {
        throw new NotFoundError("Sotuv nuqtasi topilmadi");
      }

      const products = await this.productsRepository.list(tx, auth.companyId, {
        search: filters.search,
      });
      const activeProducts = products.filter((product) => product.status === "active");

      let stockByProduct = null;
      if (filters.warehouseId) {
        const stockRows = await this.stockRepository.list(tx, auth.companyId, {
          warehouseId: filters.warehouseId,
        });
        stockByProduct = new Map(
          stockRows.filter((row) => row.variantId === null).map((row) => [row.productId, row]),
        );
      }

      let usdRate = null;
      const catalog = [];
      for (const product of activeProducts) {
        const prices = await this.productPricesRepository.listCurrentByProduct(
          tx,
          product.id,
          new Date(),
        );
        const priceRow = prices.find((p) => p.priceTypeId === salePoint.priceTypeId);
        if (!priceRow) {
          continue;
        }
        if (priceRow.currency !== "UZS" && usdRate === null) {
          const company = await this.companiesRepository.findById(tx, auth.companyId);
          usdRate = await resolveExchangeRate(
            tx,
            this.exchangeRatesRepository,
            auth.companyId,
            priceRow.currency,
            company?.settings?.exchangeRateMode ?? "cbu",
          );
        }
        const stockRow = stockByProduct?.get(product.id);
        catalog.push({
          productId: product.id,
          sku: product.sku,
          nameUz: product.nameUz,
          categoryId: product.categoryId,
          baseUnitId: product.baseUnitId,
          price: convertToUzs(Number(priceRow.price), priceRow.currency, usdRate),
          currency: "UZS",
          availableQty: stockRow ? Number(stockRow.quantity) - Number(stockRow.reserved) : null,
        });
      }
      return catalog;
    });
  }
}
