import { describe, it, expect, vi } from "vitest";

/**
 * Haqiqiy Postgres mahalliy mavjud emas (CHECKLIST.md — takroriy cheklov),
 * shuning uchun bu test `warehouse_docs`/`stock`/`stock_movements`ni
 * xotirada simulyatsiya qiladi: har jadval uchun `Map`, `stock.upsert` esa
 * `checks.sql`dagi `stock_quantity_check`ni ham takrorlaydi (manfiy
 * qoldiqda xato otadi) — shu orqali `StockRepository`/`WarehouseDocsService`
 * REAL kodi (mock emas) haqiqiy DB'dagi kabi atomik xatti-harakat bilan
 * sinaladi. Postgres mavjud bo'lganda bu fayl haqiqiy DB integratsion
 * testga almashtirilishi mumkin (CHECKLIST.md ochiq izohi).
 * @returns {object} `Prisma.TransactionClient` shaklidagi xotira fake'i.
 */
function createFakeDb() {
  const stock = new Map();
  const movements = [];
  const docs = new Map();
  const docItems = new Map();
  const counters = new Map();

  const stockKey = (k) => `${k.warehouseId}|${k.productId}|${k.variantId ?? ""}|${k.batchId ?? ""}`;

  return {
    _movements: movements,
    _stock: stock,
    stock: {
      async findUnique({ where: { warehouseId_productId_variantId_batchId: k } }) {
        return stock.get(stockKey(k)) ?? null;
      },
      async upsert({ where: { warehouseId_productId_variantId_batchId: k }, update, create }) {
        const key = stockKey(k);
        const existing = stock.get(key);
        if (existing) {
          const nextQty = Number(existing.quantity) + update.quantity.increment;
          if (nextQty < 0) {
            throw new Error("CHECK stock_quantity_check buzildi (manfiy qoldiq)");
          }
          existing.quantity = nextQty;
          return existing;
        }
        if (create.quantity < 0) {
          throw new Error("CHECK stock_quantity_check buzildi (manfiy qoldiq)");
        }
        const row = { ...create };
        stock.set(key, row);
        return row;
      },
    },
    stockMovement: {
      async create({ data }) {
        movements.push(data);
        return data;
      },
    },
    warehouseDoc: {
      async create({ data }) {
        const row = { ...data };
        docs.set(row.id, row);
        return row;
      },
      async findUnique({ where: { id }, include }) {
        const doc = docs.get(id);
        if (!doc) return null;
        if (include?.items) {
          return { ...doc, items: [...docItems.values()].filter((item) => item.docId === id) };
        }
        return { ...doc };
      },
      async update({ where: { id }, data }) {
        Object.assign(docs.get(id), data);
        return { ...docs.get(id) };
      },
    },
    warehouseDocItem: {
      async create({ data }) {
        docItems.set(data.id, data);
        return data;
      },
    },
    docCounter: {
      async upsert({ where: { companyId_docType_year: k } }) {
        const key = `${k.companyId}|${k.docType}|${k.year}`;
        const next = (counters.get(key) ?? 0) + 1;
        counters.set(key, next);
        return { counter: next };
      },
    },
  };
}

const withTenant = vi.fn();
vi.mock("../../lib/tenant-context.js", () => ({ withTenant: (...args) => withTenant(...args) }));

const { WarehouseDocsService } = await import("./warehouse-docs.service.js");
const { WarehouseDocsRepository } = await import("./warehouse-docs.repository.js");
const { StockRepository } = await import("../stock/stock.repository.js");
const { StockMovementsRepository } = await import("../stock/stock-movements.repository.js");

const auth = { userId: "u1", companyId: "c1", roleId: "r1" };
const WAREHOUSE_A = "wh-a";
const WAREHOUSE_B = "wh-b";
const PRODUCT_ID = "p1";
const UNIT_ID = "u1";

/**
 * @param {ReturnType<typeof createFakeDb>} fakeDb
 * @returns {WarehouseDocsService}
 */
function buildService(fakeDb) {
  withTenant.mockImplementation((_companyId, _userId, callback) => callback(fakeDb));

  return new WarehouseDocsService({
    warehouseDocsRepository: new WarehouseDocsRepository(),
    warehousesRepository: { findById: async (_tx, id) => ({ id }) },
    productsRepository: { findById: async () => ({ id: PRODUCT_ID, baseUnitId: UNIT_ID }) },
    productUnitsRepository: { findByProductAndUnit: async () => null },
    stockRepository: new StockRepository(),
    stockMovementsRepository: new StockMovementsRepository(),
  });
}

/**
 * @param {ReturnType<typeof createFakeDb>} fakeDb
 * @param {string} warehouseId
 * @returns {number} SUM(stock_movements.qty) shu (warehouse,product) kalit uchun.
 */
function movementsSum(fakeDb, warehouseId) {
  return fakeDb._movements
    .filter((m) => m.warehouseId === warehouseId && m.productId === PRODUCT_ID)
    .reduce((sum, m) => sum + Number(m.qty), 0);
}

describe("Stock invariant: SUM(stock_movements.qty) = stock.quantity", () => {
  it("kirim + chiqim + ko'chirish + storno ketma-ketligidan keyin invariant saqlanadi", async () => {
    const fakeDb = createFakeDb();
    const service = buildService(fakeDb);

    const receiptDoc = await service.create(auth, { type: "receipt", warehouseId: WAREHOUSE_A });
    await service.addItem(auth, receiptDoc.id, {
      productId: PRODUCT_ID,
      unitId: UNIT_ID,
      qty: 100,
    });
    await service.confirm(auth, receiptDoc.id);

    const issueDoc = await service.create(auth, { type: "issue", warehouseId: WAREHOUSE_A });
    await service.addItem(auth, issueDoc.id, { productId: PRODUCT_ID, unitId: UNIT_ID, qty: 30 });
    await service.confirm(auth, issueDoc.id);

    const transferDoc = await service.create(auth, {
      type: "transfer",
      warehouseId: WAREHOUSE_A,
      toWarehouseId: WAREHOUSE_B,
    });
    await service.addItem(auth, transferDoc.id, {
      productId: PRODUCT_ID,
      unitId: UNIT_ID,
      qty: 20,
    });
    await service.confirm(auth, transferDoc.id);

    await service.cancel(auth, issueDoc.id); // storno — +30 qaytadi

    // 100 (kirim) - 30 (chiqim) - 20 (ko'chirish chiqishi) + 30 (storno) = 80
    const stockA = fakeDb._stock.get(`${WAREHOUSE_A}|${PRODUCT_ID}||`);
    expect(stockA.quantity).toBe(80);
    expect(movementsSum(fakeDb, WAREHOUSE_A)).toBe(stockA.quantity);

    const stockB = fakeDb._stock.get(`${WAREHOUSE_B}|${PRODUCT_ID}||`);
    expect(stockB.quantity).toBe(20);
    expect(movementsSum(fakeDb, WAREHOUSE_B)).toBe(stockB.quantity);
  });
});

describe("Race condition: ikki parallel chiqim manfiy qoldiqqa olib kelmaydi", () => {
  it("qoldiqdan ko'p so'ralganda faqat bittasi muvaffaqiyatli bo'ladi", async () => {
    const fakeDb = createFakeDb();
    const service = buildService(fakeDb);

    const receiptDoc = await service.create(auth, { type: "receipt", warehouseId: WAREHOUSE_A });
    await service.addItem(auth, receiptDoc.id, { productId: PRODUCT_ID, unitId: UNIT_ID, qty: 10 });
    await service.confirm(auth, receiptDoc.id);

    const issueA = await service.create(auth, { type: "issue", warehouseId: WAREHOUSE_A });
    await service.addItem(auth, issueA.id, { productId: PRODUCT_ID, unitId: UNIT_ID, qty: 8 });
    const issueB = await service.create(auth, { type: "issue", warehouseId: WAREHOUSE_A });
    await service.addItem(auth, issueB.id, { productId: PRODUCT_ID, unitId: UNIT_ID, qty: 8 });

    // Ikkala tasdiqlash bir xil boshlang'ich qoldiqni (10) ko'rishini
    // majburlash uchun to'siq: ikkalasi ham oldindan tekshiruvga
    // yetguncha kutadi — real Postgres'da ikkita mustaqil tranzaksiyaning
    // READ COMMITTED bosqichida bir xil qatorni o'qishi bilan ekvivalent.
    let readyCount = 0;
    let releaseBarrier;
    const barrier = new Promise((resolve) => {
      releaseBarrier = resolve;
    });
    const realFindOne = fakeDb.stock.findUnique.bind(fakeDb.stock);
    fakeDb.stock.findUnique = async (args) => {
      readyCount += 1;
      if (readyCount === 2) releaseBarrier();
      await barrier;
      return realFindOne(args);
    };

    const results = await Promise.allSettled([
      service.confirm(auth, issueA.id),
      service.confirm(auth, issueB.id),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Invariant: manfiy qoldiq yo'q, va faqat muvaffaqiyatli harakat jurnalga yozilgan.
    const stockA = fakeDb._stock.get(`${WAREHOUSE_A}|${PRODUCT_ID}||`);
    expect(stockA.quantity).toBeGreaterThanOrEqual(0);
    expect(stockA.quantity).toBe(2); // 10 - 8 (faqat bitta chiqim o'tdi)
    expect(movementsSum(fakeDb, WAREHOUSE_A)).toBe(stockA.quantity);
  });
});
