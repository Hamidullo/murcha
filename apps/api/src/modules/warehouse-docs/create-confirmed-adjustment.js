import { uuidv7 } from "uuidv7";

/**
 * Bitta sklad, bitta mahsulot uchun **darhol tasdiqlangan** tuzatish
 * hujjati (kirim `delta>0`, spisaniye `delta<0`) — `stock`ni signed `delta`
 * bilan atomik yangilaydi + immutable `StockMovement` yozadi. Ikkita real
 * chaqiruvchi bor: `imports` (Excel qoldiq import — target-qoldiq farqi) va
 * `inventory-counts` (inventarizatsiya tasdiqlash — sanoq farqi); shu
 * sabab umumiy funksiyaga chiqarildi (bitta sklad, transfer emas — shuning
 * uchun `warehouse-docs.service.js`dagi deadlock-tartib kerak emas, oddiy
 * to'g'ridan-to'g'ri yozuv yetarli).
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {{
 *   warehouseDocsRepository: import("./warehouse-docs.repository.js").WarehouseDocsRepository,
 *   stockRepository: import("../stock/stock.repository.js").StockRepository,
 *   stockMovementsRepository: import("../stock/stock-movements.repository.js").StockMovementsRepository,
 * }} repos
 * @param {{ companyId: string, userId: string, warehouseId: string, productId: string, unitId: string, variantId?: string | null, batchId?: string | null, delta: number }} params
 * @returns {Promise<import("@prisma/client").WarehouseDoc | null>} `delta === 0` bo'lsa `null` (hujjat yaratilmaydi).
 */
export async function applyStockAdjustment(tx, repos, params) {
  const {
    companyId,
    userId,
    warehouseId,
    productId,
    unitId,
    variantId = null,
    batchId = null,
    delta,
  } = params;

  if (delta === 0) {
    return null;
  }

  const docType = delta > 0 ? "receipt" : "writeoff";
  const year = new Date().getFullYear();
  const counter = await repos.warehouseDocsRepository.nextCounter(tx, companyId, docType, year);
  const prefix = docType === "receipt" ? "KIR" : "SPIS";
  const number = `${prefix}-${year}-${String(counter).padStart(5, "0")}`;

  const doc = await repos.warehouseDocsRepository.create(tx, {
    id: uuidv7(),
    companyId,
    type: docType,
    number,
    warehouseId,
    status: "confirmed",
    currency: "UZS",
    total: 0,
    confirmedAt: new Date(),
    confirmedBy: userId,
    createdBy: userId,
  });
  const item = await repos.warehouseDocsRepository.addItem(tx, {
    id: uuidv7(),
    docId: doc.id,
    productId,
    variantId,
    batchId,
    unitId,
    qty: Math.abs(delta),
    qtyBase: Math.abs(delta),
    price: null,
    total: null,
  });
  await repos.stockRepository.applyDelta(tx, {
    id: uuidv7(),
    companyId,
    warehouseId,
    productId,
    variantId,
    batchId,
    qtyDelta: delta,
  });
  await repos.stockMovementsRepository.create(tx, {
    id: uuidv7(),
    companyId,
    warehouseId,
    productId,
    variantId,
    batchId,
    docType,
    docId: doc.id,
    docItemId: item.id,
    qty: delta,
    costPrice: null,
    createdBy: userId,
  });

  return doc;
}
