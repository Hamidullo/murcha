import { describe, it, expect, vi, beforeEach } from "vitest";
import ExcelJS from "exceljs";

const fakeTx = {};
const withTenant = vi.fn((_companyId, _userId, callback) => callback(fakeTx));
vi.mock("../../lib/tenant-context.js", () => ({ withTenant }));

const { ExportsService } = await import("./exports.service.js");

/**
 * @param {ExcelJS.Buffer} buffer
 * @returns {Promise<ExcelJS.Worksheet>}
 */
async function readFirstSheet(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets[0];
}

describe("ExportsService", () => {
  const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
  let productsRepository;
  let stockRepository;
  let counterpartiesRepository;
  let service;

  beforeEach(() => {
    withTenant.mockClear();
    productsRepository = { list: vi.fn() };
    stockRepository = { list: vi.fn() };
    counterpartiesRepository = { list: vi.fn() };
    service = new ExportsService({ productsRepository, stockRepository, counterpartiesRepository });
  });

  it("exportProducts — mahsulotlarni haqiqiy .xlsx qatorlariga yozadi", async () => {
    productsRepository.list.mockResolvedValue([
      {
        sku: "SKU-1",
        nameUz: "Non",
        status: "active",
        category: { nameUz: "Non mahsulotlari" },
        baseUnit: { short: "dona" },
      },
    ]);

    const buffer = await service.exportProducts(auth);
    const sheet = await readFirstSheet(buffer);

    expect(productsRepository.list).toHaveBeenCalledWith(fakeTx, "c1", {});
    expect(sheet.getRow(1).getCell(1).value).toBe("SKU");
    expect(sheet.getRow(2).getCell(1).value).toBe("SKU-1");
    expect(sheet.getRow(2).getCell(3).value).toBe("Non mahsulotlari");
    expect(sheet.getRow(2).getCell(4).value).toBe("dona");
  });

  it("exportStock — qoldiqni yozadi, Decimal Number'ga aylanadi", async () => {
    stockRepository.list.mockResolvedValue([
      {
        warehouse: { name: "Markaziy sklad" },
        product: { nameUz: "Non", sku: "SKU-1" },
        quantity: 42,
        minQty: 5,
      },
    ]);

    const buffer = await service.exportStock(auth);
    const sheet = await readFirstSheet(buffer);

    expect(sheet.getRow(2).getCell(1).value).toBe("Markaziy sklad");
    expect(sheet.getRow(2).getCell(4).value).toBe(42);
    expect(sheet.getRow(2).getCell(5).value).toBe(5);
  });

  it("exportCounterparties — kontragentlarni yozadi", async () => {
    counterpartiesRepository.list.mockResolvedValue([
      { type: "supplier", name: "Aziz Trade", phone: "+998901234567", paymentTermDays: 14 },
    ]);

    const buffer = await service.exportCounterparties(auth);
    const sheet = await readFirstSheet(buffer);

    expect(sheet.getRow(2).getCell(1).value).toBe("supplier");
    expect(sheet.getRow(2).getCell(2).value).toBe("Aziz Trade");
    expect(sheet.getRow(2).getCell(6).value).toBe(14);
  });
});
