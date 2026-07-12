import ExcelJS from "exceljs";
import { withTenant } from "../../lib/tenant-context.js";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Faqat o'qish — mavjud
 * repositorylardan (`products`/`stock`/`counterparties`) qayta ishlatiladi,
 * yangi DB so'rov yozilmaydi. Import (`imports` moduli) alohida vazifada.
 */
export class ExportsService {
  /**
   * @param {{
   *   productsRepository: import("../products/products.repository.js").ProductsRepository,
   *   stockRepository: import("../stock/stock.repository.js").StockRepository,
   *   counterpartiesRepository: import("../counterparties/counterparties.repository.js").CounterpartiesRepository,
   * }} deps
   */
  constructor({ productsRepository, stockRepository, counterpartiesRepository }) {
    this.productsRepository = productsRepository;
    this.stockRepository = stockRepository;
    this.counterpartiesRepository = counterpartiesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<ExcelJS.Buffer>}
   */
  async exportProducts(auth) {
    const products = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.productsRepository.list(tx, auth.companyId, {}),
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Mahsulotlar");
    sheet.columns = [
      { header: "SKU", key: "sku", width: 20 },
      { header: "Nomi", key: "nameUz", width: 30 },
      { header: "Kategoriya", key: "category", width: 20 },
      { header: "Asosiy birlik", key: "unit", width: 12 },
      { header: "Holat", key: "status", width: 12 },
    ];
    for (const product of products) {
      sheet.addRow({
        sku: product.sku,
        nameUz: product.nameUz,
        category: product.category?.nameUz ?? "",
        unit: product.baseUnit?.short ?? "",
        status: product.status,
      });
    }
    return workbook.xlsx.writeBuffer();
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<ExcelJS.Buffer>}
   */
  async exportStock(auth) {
    const rows = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.stockRepository.list(tx, auth.companyId, {}),
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Qoldiq");
    sheet.columns = [
      { header: "Sklad", key: "warehouse", width: 20 },
      { header: "Mahsulot", key: "product", width: 30 },
      { header: "SKU", key: "sku", width: 20 },
      { header: "Miqdor", key: "quantity", width: 12 },
      { header: "Min qoldiq", key: "minQty", width: 12 },
    ];
    for (const row of rows) {
      sheet.addRow({
        warehouse: row.warehouse?.name ?? "",
        product: row.product?.nameUz ?? "",
        sku: row.product?.sku ?? "",
        quantity: Number(row.quantity),
        minQty: row.minQty != null ? Number(row.minQty) : "",
      });
    }
    return workbook.xlsx.writeBuffer();
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<ExcelJS.Buffer>}
   */
  async exportCounterparties(auth) {
    const counterparties = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.counterpartiesRepository.list(tx, auth.companyId, {}),
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Kontragentlar");
    sheet.columns = [
      { header: "Turi", key: "type", width: 12 },
      { header: "Nomi", key: "name", width: 30 },
      { header: "Telefon", key: "phone", width: 18 },
      { header: "STIR", key: "tin", width: 15 },
      { header: "Kredit limiti", key: "creditLimit", width: 15 },
      { header: "To'lov muddati (kun)", key: "paymentTermDays", width: 18 },
    ];
    for (const cp of counterparties) {
      sheet.addRow({
        type: cp.type,
        name: cp.name,
        phone: cp.phone ?? "",
        tin: cp.tin ?? "",
        creditLimit: cp.creditLimit != null ? Number(cp.creditLimit) : "",
        paymentTermDays: cp.paymentTermDays,
      });
    }
    return workbook.xlsx.writeBuffer();
  }
}
