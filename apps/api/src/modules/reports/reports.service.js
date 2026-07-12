import { withTenant } from "../../lib/tenant-context.js";
import { computeAverageCost } from "../../lib/inventory-cost.js";
import { computeOpenOrderBalances } from "../../lib/debt-netting.js";

/** Kassa balansini netto qilishda yopiq tomonga ishora qiluvchi tur (`cash.service.js`dagi bilan bir xil). */
const CASH_INFLOW_TYPES = new Set(["income", "transfer_in"]);

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). "Sotilgan" = `status:"accepted"`
 * zakazlar, summasi `qtyAccepted × price` (jo'natilgan emas, haqiqatda
 * qabul qilingan — `debt_movements`dagi `type:"order"` bilan bir xil
 * mantiq, Faza 8). Guruhlash repository darajasida emas, shu qatlamda
 * oddiy JS `reduce` bilan (loyiha konvensiyasi — `debt-netting.js`dagi
 * aging hisoblash naqshi). Marja — **joriy o'rtacha tannarx** bilan
 * (sotuv vaqtidagi tarixiy tannarx emas — MVP soddalashtirish).
 */
export class ReportsService {
  /**
   * @param {{
   *   ordersRepository: import("../orders/orders.repository.js").OrdersRepository,
   *   stockMovementsRepository: import("../stock/stock-movements.repository.js").StockMovementsRepository,
   *   stockRepository: import("../stock/stock.repository.js").StockRepository,
   *   productsRepository: import("../products/products.repository.js").ProductsRepository,
   *   transactionsRepository: import("../cash/transactions.repository.js").TransactionsRepository,
   *   debtMovementsRepository: import("../debts/debts.repository.js").DebtMovementsRepository,
   * }} deps
   */
  constructor({
    ordersRepository,
    stockMovementsRepository,
    stockRepository,
    productsRepository,
    transactionsRepository,
    debtMovementsRepository,
  }) {
    this.ordersRepository = ordersRepository;
    this.stockMovementsRepository = stockMovementsRepository;
    this.stockRepository = stockRepository;
    this.productsRepository = productsRepository;
    this.transactionsRepository = transactionsRepository;
    this.debtMovementsRepository = debtMovementsRepository;
  }

  /**
   * Kunlik sotuv dinamikasi — sana `order.confirmedAt` bo'yicha.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").salesReportQuerySchema._type} filters
   * @returns {Promise<Array<{ date: string, total: number, count: number }>>}
   */
  async getSalesDynamics(auth, filters) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const orders = await this.ordersRepository.listAcceptedForReports(
        tx,
        auth.companyId,
        filters,
      );
      const byDate = new Map();
      for (const order of orders) {
        const date = order.confirmedAt.toISOString().slice(0, 10);
        const revenue = order.items.reduce(
          (sum, item) => sum + Number(item.price) * Number(item.qtyAccepted),
          0,
        );
        const entry = byDate.get(date) ?? { date, total: 0, count: 0 };
        entry.total += revenue;
        entry.count += 1;
        byDate.set(date, entry);
      }
      return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  /**
   * Top mahsulotlar (daromad bo'yicha) + marja — joriy o'rtacha tannarx bilan.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").productsReportQuerySchema._type} filters
   * @returns {Promise<Array<{ productId: string, name: string, sku: string, qty: number, revenue: number, cost: number | null, margin: number | null, marginPct: number | null }>>}
   */
  async getProductsReport(auth, filters) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const orders = await this.ordersRepository.listAcceptedForReports(
        tx,
        auth.companyId,
        filters,
      );
      const byProduct = new Map();
      for (const order of orders) {
        for (const item of order.items) {
          const qty = Number(item.qtyAccepted);
          if (qty <= 0) continue;
          const revenue = Number(item.price) * qty;
          const entry = byProduct.get(item.productId) ?? {
            productId: item.productId,
            name: item.product.nameUz,
            sku: item.product.sku,
            qty: 0,
            revenue: 0,
          };
          entry.qty += qty;
          entry.revenue += revenue;
          byProduct.set(item.productId, entry);
        }
      }

      const products = [...byProduct.values()];
      for (const product of products) {
        const movements = await this.stockMovementsRepository.listPositiveWithCost(tx, {
          companyId: auth.companyId,
          productId: product.productId,
        });
        const averageCost = computeAverageCost(movements);
        product.cost = averageCost != null ? averageCost * product.qty : null;
        product.margin = product.cost != null ? product.revenue - product.cost : null;
        product.marginPct =
          product.margin != null && product.revenue > 0
            ? (product.margin / product.revenue) * 100
            : null;
      }

      products.sort((a, b) => b.revenue - a.revenue);
      return filters.limit ? products.slice(0, filters.limit) : products;
    });
  }

  /**
   * Sklad aylanmasi — chiqim summasi ÷ o'rtacha qoldiq qiymati. O'rtacha
   * qoldiq **joriy qoldiq × joriy o'rtacha tannarx** bilan yaqinlashtiriladi
   * (chinakam vaqt-og'irlikli o'rtacha snapshot tarixini talab qiladi, MVP
   * uchun keraksiz murakkablik).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").stockTurnoverQuerySchema._type} filters
   * @returns {Promise<Array<{ productId: string, name: string, outboundQty: number, outboundValue: number, avgStockValue: number | null, turnoverRatio: number | null }>>}
   */
  async getStockTurnover(auth, filters) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const movements = await this.stockMovementsRepository.listByPeriod(
        tx,
        auth.companyId,
        filters,
      );
      const outboundByProduct = new Map();
      for (const m of movements) {
        const qty = Number(m.qty);
        if (qty >= 0) continue;
        const entry = outboundByProduct.get(m.productId) ?? {
          productId: m.productId,
          outboundQty: 0,
          outboundValue: 0,
        };
        entry.outboundQty += Math.abs(qty);
        entry.outboundValue += Math.abs(qty) * Number(m.costPrice ?? 0);
        outboundByProduct.set(m.productId, entry);
      }

      const results = [];
      for (const entry of outboundByProduct.values()) {
        const [stockRows, positiveMovements, product] = await Promise.all([
          this.stockRepository.list(tx, auth.companyId, { productId: entry.productId }),
          this.stockMovementsRepository.listPositiveWithCost(tx, {
            companyId: auth.companyId,
            productId: entry.productId,
          }),
          this.productsRepository.findById(tx, entry.productId),
        ]);
        const currentQty = stockRows.reduce((sum, row) => sum + Number(row.quantity), 0);
        const averageCost = computeAverageCost(positiveMovements);
        const avgStockValue = averageCost != null ? currentQty * averageCost : null;
        results.push({
          productId: entry.productId,
          name: product?.nameUz ?? "",
          outboundQty: entry.outboundQty,
          outboundValue: entry.outboundValue,
          avgStockValue,
          turnoverRatio:
            avgStockValue != null && avgStockValue > 0 ? entry.outboundValue / avgStockValue : null,
        });
      }

      results.sort((a, b) => b.outboundValue - a.outboundValue);
      return results;
    });
  }

  /**
   * Ega dashboardi — bugungi sotuv, kutilayotgan zakazlar, kassa qoldig'i
   * (valyuta kesimida), qarzdorlik (jami+muddati o'tgan), tugayotgan
   * mahsulotlar soni. `debts`/`stock`/`cash` **servislariga emas**, ularning
   * repository'lariga bog'lanadi (servis servisga bog'lanmaydi qoidasi) —
   * `debts.service.js getAging()`ning ichki mantig'ini takror ishlatadi.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<{ todaySales: number, pendingOrders: number, cashBalanceByCurrency: Record<string, number>, debtTotal: number, debtOverdue: number, lowStockCount: number }>}
   */
  async getDashboard(auth) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setUTCHours(23, 59, 59, 999);

      const [todaysOrders, pendingOrders, transactions, movements, stockRows] = await Promise.all([
        this.ordersRepository.listAcceptedForReports(tx, auth.companyId, {
          from: todayStart,
          to: todayEnd,
        }),
        this.ordersRepository.countPending(tx, auth.companyId),
        this.transactionsRepository.list(tx, auth.companyId, {}),
        this.debtMovementsRepository.listOrderLinkedMovements(tx, auth.companyId),
        this.stockRepository.list(tx, auth.companyId, { onlyTracked: true }),
      ]);

      const todaySales = todaysOrders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce((s, item) => s + Number(item.price) * Number(item.qtyAccepted), 0),
        0,
      );

      const cashBalanceByCurrency = {};
      for (const t of transactions) {
        const sign = CASH_INFLOW_TYPES.has(t.type) ? 1 : -1;
        cashBalanceByCurrency[t.currency] =
          (cashBalanceByCurrency[t.currency] ?? 0) + sign * Number(t.amount);
      }

      const openOrders = computeOpenOrderBalances(movements, now);
      const debtTotal = openOrders.reduce((sum, o) => sum + o.balance, 0);
      const debtOverdue = openOrders
        .filter((o) => o.bucket !== "notDue")
        .reduce((sum, o) => sum + o.balance, 0);

      const lowStockCount = stockRows.filter(
        (row) => Number(row.quantity) <= Number(row.minQty),
      ).length;

      return {
        todaySales,
        pendingOrders,
        cashBalanceByCurrency,
        debtTotal,
        debtOverdue,
        lowStockCount,
      };
    });
  }
}
