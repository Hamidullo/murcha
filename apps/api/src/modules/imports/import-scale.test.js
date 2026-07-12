import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { importProductRow } from "./import-processors.js";

/**
 * Faza 4 "Natija" mezoni: "1000 qatorli Excel import qilinadi". Haqiqiy
 * BullMQ/MinIO/Postgres mahalliy mavjud emas (takroriy cheklov), shuning
 * uchun worker'ning qator-parslash+qayta-ishlash quvuri (real `exceljs`
 * workbook + real `importProductRow`, faqat repository darajasi xotirada
 * fake — Faza 3'dagi invariant test uslubi) 1000 qatorda sinaladi.
 */
/** @returns {object} `ProductsRepository`ning `findBySku`/`create`/`update` qismini xotirada taqlid qiladi. */
function createFakeProductsRepo() {
  const bySku = new Map();
  return {
    async findBySku(_tx, sku) {
      return bySku.get(sku) ?? null;
    },
    async create(_tx, data) {
      bySku.set(data.sku, data);
      return data;
    },
    async update(_tx, id, data) {
      const existing = [...bySku.values()].find((p) => p.id === id);
      Object.assign(existing, data);
      return existing;
    },
    _bySku: bySku,
  };
}

describe("1000 qatorli Excel import", () => {
  it("worker'dagi bilan bir xil parslash+qayta-ishlash orqali 1000 qator to'g'ri o'tadi", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Mahsulotlar");
    sheet.addRow(["SKU", "Nomi", "Kategoriya", "Asosiy birlik", "Holat"]);
    for (let i = 1; i <= 1000; i += 1) {
      sheet.addRow([`SKU-${i}`, `Mahsulot ${i}`, "", "dona", "active"]);
    }
    const buffer = await workbook.xlsx.writeBuffer();

    const readBack = new ExcelJS.Workbook();
    await readBack.xlsx.load(buffer);
    const readSheet = readBack.worksheets[0];

    const rows = [];
    readSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.push({ rowNumber, values: row.values });
    });
    expect(rows).toHaveLength(1000);

    const productsRepository = createFakeProductsRepo();
    const repos = {
      productsRepository,
      categoriesRepository: { list: async () => [] },
      unitsRepository: { list: async () => [{ id: "unit1", name: "dona", short: "dona" }] },
    };

    const started = Date.now();
    let succeeded = 0;
    let failed = 0;
    for (const { values } of rows) {
      try {
        await importProductRow({}, repos, "c1", {
          sku: values[1],
          nameUz: values[2],
          categoryName: values[3],
          unitName: values[4],
          status: values[5],
        });
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }
    const elapsedMs = Date.now() - started;

    expect(succeeded).toBe(1000);
    expect(failed).toBe(0);
    expect(productsRepository._bySku.size).toBe(1000);
    // Aniq vaqt chegarasi qo'yilmadi (real Postgres bilan boshqacha bo'ladi) —
    // shunchaki sekundlar tartibida ekanini ko'rsatish uchun.
    expect(elapsedMs).toBeLessThan(10_000);
  });
});
