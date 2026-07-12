/**
 * Og'irlashtirilgan o'rtacha tannarx — `SUM(qty*costPrice)/SUM(qty)`.
 * `stock.service.js averageCost()` va `reports.service.js` (marja hisobi)
 * ikkalasi ham shu funksiyani ishlatadi (`stock_movements.listPositiveWithCost()`
 * orqali olingan harakatlar bilan) — ikki joyda mustaqil yozilib
 * chalkashib ketmasligi uchun (`lib/debt-netting.js`dan bir xil naqsh).
 * @param {Array<{ qty: number | import("@prisma/client/runtime/library").Decimal, costPrice: number | import("@prisma/client/runtime/library").Decimal }>} movements
 * @returns {number | null}
 */
export function computeAverageCost(movements) {
  const totalQty = movements.reduce((sum, m) => sum + Number(m.qty), 0);
  const totalCost = movements.reduce((sum, m) => sum + Number(m.qty) * Number(m.costPrice), 0);
  return totalQty > 0 ? totalCost / totalQty : null;
}
