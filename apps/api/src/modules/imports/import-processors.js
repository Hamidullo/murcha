import { uuidv7 } from "uuidv7";
import { applyStockAdjustment } from "../warehouse-docs/create-confirmed-adjustment.js";

/**
 * Bir qator = bitta mahsulot. `SKU` bo'yicha upsert — mavjud bo'lsa
 * yangilaydi, bo'lmasa yaratadi (Excel export'ning ustun tartibi bilan bir
 * xil: SKU/Nomi/Kategoriya/Asosiy birlik/Holat).
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {{ productsRepository: import("../products/products.repository.js").ProductsRepository, categoriesRepository: import("../categories/categories.repository.js").CategoriesRepository, unitsRepository: import("../units/units.repository.js").UnitsRepository }} repos
 * @param {string} companyId
 * @param {{ sku: string, nameUz: string, categoryName?: string, unitName: string, status?: string }} row
 * @returns {Promise<void>}
 */
export async function importProductRow(tx, repos, companyId, row) {
  if (!row.sku || !row.nameUz) {
    throw new Error("SKU va nomi majburiy");
  }

  const units = await repos.unitsRepository.list(tx);
  const unitName = String(row.unitName ?? "")
    .trim()
    .toLowerCase();
  const unit = units.find(
    (u) => u.short.toLowerCase() === unitName || u.name.toLowerCase() === unitName,
  );
  if (!unit) {
    throw new Error(`Birlik topilmadi: ${row.unitName}`);
  }

  let categoryId = null;
  if (row.categoryName) {
    const categories = await repos.categoriesRepository.list(tx, companyId);
    const categoryName = String(row.categoryName).trim().toLowerCase();
    const category = categories.find((c) => c.nameUz.toLowerCase() === categoryName);
    if (!category) {
      throw new Error(`Kategoriya topilmadi: ${row.categoryName}`);
    }
    categoryId = category.id;
  }

  const existing = await repos.productsRepository.findBySku(tx, row.sku);
  if (existing) {
    await repos.productsRepository.update(tx, existing.id, {
      nameUz: row.nameUz,
      categoryId,
      baseUnitId: unit.id,
      ...(row.status ? { status: row.status } : {}),
    });
    return;
  }
  await repos.productsRepository.create(tx, {
    id: uuidv7(),
    companyId,
    sku: row.sku,
    nameUz: row.nameUz,
    categoryId,
    baseUnitId: unit.id,
    status: row.status || "active",
  });
}

/**
 * Bir qator = bitta sklad+mahsulot uchun **maqsad (target) qoldiq**.
 * To'g'ridan-to'g'ri `Stock.quantity`ga UPDATE qilinmaydi (CLAUDE.md:
 * "qoldiq o'zgarishi faqat stock_movements immutable jurnal orqali") —
 * joriy qoldiq bilan farq (`delta`) hisoblanadi, `delta !== 0` bo'lsa
 * darhol `confirmed` tuzatish hujjati (kirim/spisaniye) yaratiladi.
 * `imported = current + delta` bo'lgani uchun, `imported >= 0` bo'lsa
 * natija hech qachon manfiy bo'lmaydi — oldindan tekshiruv shart emas.
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {{ warehousesRepository: import("../warehouses/warehouses.repository.js").WarehousesRepository, productsRepository: import("../products/products.repository.js").ProductsRepository, stockRepository: import("../stock/stock.repository.js").StockRepository, stockMovementsRepository: import("../stock/stock-movements.repository.js").StockMovementsRepository, warehouseDocsRepository: import("../warehouse-docs/warehouse-docs.repository.js").WarehouseDocsRepository }} repos
 * @param {string} companyId
 * @param {string} userId
 * @param {{ warehouseName: string, sku: string, quantity: number }} row
 * @returns {Promise<void>}
 */
export async function importStockRow(tx, repos, companyId, userId, row) {
  if (!row.warehouseName || !row.sku || row.quantity == null || Number.isNaN(row.quantity)) {
    throw new Error("Sklad, SKU va miqdor majburiy");
  }
  if (row.quantity < 0) {
    throw new Error("Miqdor manfiy bo'lishi mumkin emas");
  }

  const warehouses = await repos.warehousesRepository.list(tx, companyId);
  const warehouseName = String(row.warehouseName).trim().toLowerCase();
  const warehouse = warehouses.find((w) => w.name.toLowerCase() === warehouseName);
  if (!warehouse) {
    throw new Error(`Sklad topilmadi: ${row.warehouseName}`);
  }

  const product = await repos.productsRepository.findBySku(tx, row.sku);
  if (!product) {
    throw new Error(`Mahsulot topilmadi (SKU): ${row.sku}`);
  }

  const key = { warehouseId: warehouse.id, productId: product.id, variantId: null, batchId: null };
  const current = await repos.stockRepository.findOne(tx, key);
  const currentQty = current ? Number(current.quantity) : 0;
  const delta = Number(row.quantity) - currentQty;

  await applyStockAdjustment(tx, repos, {
    companyId,
    userId,
    warehouseId: warehouse.id,
    productId: product.id,
    unitId: product.baseUnitId,
    delta,
  });
}

const COUNTERPARTY_TYPES = new Set(["supplier", "customer", "both"]);

/**
 * Bir qator = bitta kontragent. `STIR` (tin) berilgan va mos yozuv topilsa
 * yangilaydi, aks holda yangi yaratadi (tabiiy noyob kalit yo'q — nom
 * takrorlanishi mumkin).
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {{ counterpartiesRepository: import("../counterparties/counterparties.repository.js").CounterpartiesRepository }} repos
 * @param {string} companyId
 * @param {{ type: string, name: string, phone?: string, tin?: string, creditLimit?: number, paymentTermDays?: number }} row
 * @returns {Promise<void>}
 */
export async function importCounterpartyRow(tx, repos, companyId, row) {
  if (!row.type || !row.name) {
    throw new Error("Turi va nomi majburiy");
  }
  if (!COUNTERPARTY_TYPES.has(row.type)) {
    throw new Error(`Noto'g'ri tur: ${row.type}`);
  }

  let existing = null;
  if (row.tin) {
    const list = await repos.counterpartiesRepository.list(tx, companyId, {});
    existing = list.find((c) => c.tin === row.tin) ?? null;
  }

  const data = {
    type: row.type,
    name: row.name,
    phone: row.phone || null,
    tin: row.tin || null,
    creditLimit: row.creditLimit != null ? row.creditLimit : null,
    paymentTermDays: row.paymentTermDays != null ? row.paymentTermDays : 0,
  };

  if (existing) {
    await repos.counterpartiesRepository.update(tx, existing.id, data);
    return;
  }
  await repos.counterpartiesRepository.create(tx, { id: uuidv7(), companyId, ...data });
}
