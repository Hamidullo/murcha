import { withTenant } from "../../lib/tenant-context.js";
import { computeAverageCost } from "../../lib/inventory-cost.js";

/** BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Faqat o'qish — yozish `warehouse-docs` orqali. */
export class StockService {
  /**
   * @param {{
   *   stockRepository: import("./stock.repository.js").StockRepository,
   *   stockMovementsRepository: import("./stock-movements.repository.js").StockMovementsRepository,
   * }} deps
   */
  constructor({ stockRepository, stockMovementsRepository }) {
    this.stockRepository = stockRepository;
    this.stockMovementsRepository = stockMovementsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ warehouseId?: string, productId?: string }} [filters]
   * @returns {Promise<import("@prisma/client").Stock[]>}
   */
  async list(auth, filters) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.stockRepository.list(tx, auth.companyId, filters),
    );
  }

  /**
   * `quantity <= minQty` bo'lgan qatorlar (`minQty` belgilanganlar orasidan).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ warehouseId?: string }} [filters]
   * @returns {Promise<import("@prisma/client").Stock[]>}
   */
  async listLowStock(auth, filters) {
    const rows = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.stockRepository.list(tx, auth.companyId, { ...filters, onlyTracked: true }),
    );
    return rows.filter((row) => Number(row.quantity) <= Number(row.minQty));
  }

  /**
   * Og'irlashtirilgan o'rtacha tannarx — `stock_movements.cost_price`dan
   * so'rov vaqtida hisoblanadi (alohida ustun saqlanmaydi, DATABASE.md
   * sxemasi muzlatilgan).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ productId: string, warehouseId?: string }} filters
   * @returns {Promise<{ productId: string, averageCost: number | null }>}
   */
  async averageCost(auth, filters) {
    const movements = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.stockMovementsRepository.listPositiveWithCost(tx, {
        companyId: auth.companyId,
        productId: filters.productId,
        warehouseId: filters.warehouseId,
      }),
    );

    return {
      productId: filters.productId,
      averageCost: computeAverageCost(movements),
    };
  }
}
