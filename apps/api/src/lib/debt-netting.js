/**
 * `debt_movements`dan order bo'yicha ochiq qoldiqni hisoblash — `debts` va
 * `payments` modullari ikkalasi ham ishlatadi (aging va FIFO to'lov
 * taqsimlash bir xil netting mantig'iga tayanadi, ikki joyda mustaqil
 * yozilsa moliyaviy hisob-kitob ikkiga bo'linib ketishi mumkin).
 */

const AGING_BUCKETS = ["notDue", "d0_15", "d16_30", "d31_60", "d60plus"];

/**
 * Berilgan kunlar soni (dueDate'dan asOf'gacha) bo'yicha bucket nomini
 * qaytaradi.
 * @param {number} ageDays
 * @returns {string}
 */
function bucketFor(ageDays) {
  if (ageDays <= 0) return "notDue";
  if (ageDays <= 15) return "d0_15";
  if (ageDays <= 30) return "d16_30";
  if (ageDays <= 60) return "d31_60";
  return "d60plus";
}

/**
 * `orderId` bog'langan yozuvlarni (order + shu orderga tegishli
 * payment/return kamaytirishlari) order bo'yicha netto qiladi. Faqat ochiq
 * qoldig'i bor (balance > 0) orderlar qaytariladi.
 * @param {Array<{ orderId: string, counterpartyId: string, amount: import("@prisma/client/runtime/library").Decimal, dueDate: Date | null, currency: string, order: { number: string } | null, counterparty: { name: string } }>} movements
 * @param {Date} asOf
 * @returns {Array<{ orderId: string, orderNumber: string, counterpartyId: string, counterpartyName: string, currency: string, dueDate: Date | null, balance: number, ageDays: number, bucket: string }>}
 */
export function computeOpenOrderBalances(movements, asOf) {
  const byOrder = new Map();
  for (const m of movements) {
    let entry = byOrder.get(m.orderId);
    if (!entry) {
      entry = {
        orderId: m.orderId,
        orderNumber: m.order?.number ?? "",
        counterpartyId: m.counterpartyId,
        counterpartyName: m.counterparty?.name ?? "",
        currency: m.currency,
        dueDate: null,
        balance: 0,
      };
      byOrder.set(m.orderId, entry);
    }
    entry.balance += Number(m.amount);
    if (m.dueDate) entry.dueDate = m.dueDate;
  }

  const result = [];
  for (const entry of byOrder.values()) {
    if (entry.balance <= 0) continue;
    const ageDays = entry.dueDate
      ? Math.floor((asOf.getTime() - new Date(entry.dueDate).getTime()) / 86_400_000)
      : 0;
    result.push({ ...entry, ageDays, bucket: bucketFor(ageDays) });
  }
  return result;
}

export { AGING_BUCKETS };
