import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError, ForbiddenError } from "../../lib/errors.js";
import { computeOpenOrderBalances, AGING_BUCKETS } from "../../lib/debt-netting.js";
import { renderDebtStatementPdf } from "./debts.pdf.js";

const VIEW_PERMISSION = "debts.view";
const MANAGE_PERMISSION = "debts.manage";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Balans/statement ko'rish —
 * `debts.view`/`debts.manage` bo'lsa istalgan kontragent, bo'lmasa faqat o'z
 * sotuv nuqtasining kontragenti (egalik tekshiruvi, `orders.service.js`dagi
 * `canViewAll` naqshi bilan bir xil). Aging — kompaniya bo'yicha hisobot,
 * faqat `debts.view`.
 */
export class DebtsService {
  /**
   * @param {{
   *   debtMovementsRepository: import("./debts.repository.js").DebtMovementsRepository,
   *   salePointsRepository: import("../sale-points/sale-points.repository.js").SalePointsRepository,
   *   counterpartiesRepository: import("../counterparties/counterparties.repository.js").CounterpartiesRepository,
   *   userAssignmentsRepository: import("../user-assignments/user-assignments.repository.js").UserAssignmentsRepository,
   *   rolesRepository: import("../roles/roles.repository.js").RolesRepository,
   *   companiesRepository: import("../companies/companies.repository.js").CompaniesRepository,
   * }} deps
   */
  constructor({
    debtMovementsRepository,
    salePointsRepository,
    counterpartiesRepository,
    userAssignmentsRepository,
    rolesRepository,
    companiesRepository,
  }) {
    this.debtMovementsRepository = debtMovementsRepository;
    this.salePointsRepository = salePointsRepository;
    this.counterpartiesRepository = counterpartiesRepository;
    this.userAssignmentsRepository = userAssignmentsRepository;
    this.rolesRepository = rolesRepository;
    this.companiesRepository = companiesRepository;
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ companyId: string, roleId: string }} auth
   * @returns {Promise<boolean>}
   */
  async #canViewAll(tx, auth) {
    const canManage = await this.rolesRepository.hasPermission(tx, auth.roleId, MANAGE_PERMISSION);
    if (canManage) return true;
    return this.rolesRepository.hasPermission(tx, auth.roleId, VIEW_PERMISSION);
  }

  /**
   * `id` kontragentini ko'rishga ruxsat bor-yo'qligini tekshiradi: ruxsat
   * bo'lsa o'tadi, bo'lmasa faqat o'z sotuv nuqtasining kontragenti bo'lsa.
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} counterpartyId
   * @returns {Promise<void>}
   */
  async #assertCanView(tx, auth, counterpartyId) {
    if (await this.#canViewAll(tx, auth)) return;
    const salePointId = await this.userAssignmentsRepository.findSalePointIdForUser(
      tx,
      auth.companyId,
      auth.userId,
    );
    const salePoint = salePointId
      ? await this.salePointsRepository.findById(tx, salePointId)
      : null;
    if (!salePoint || salePoint.counterpartyId !== counterpartyId) {
      throw new NotFoundError("Kontragent topilmadi");
    }
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} counterpartyId
   * @param {string} [currency]
   * @returns {Promise<{ counterpartyId: string, currency: string, balance: number }>}
   */
  async getBalance(auth, counterpartyId, currency = "UZS") {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const counterparty = await this.counterpartiesRepository.findById(tx, counterpartyId);
      if (!counterparty || counterparty.companyId !== auth.companyId) {
        throw new NotFoundError("Kontragent topilmadi");
      }
      await this.#assertCanView(tx, auth, counterpartyId);
      const balance = await this.debtMovementsRepository.getBalance(
        tx,
        auth.companyId,
        counterpartyId,
        currency,
      );
      return { counterpartyId, currency, balance };
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} counterpartyId
   * @param {{ from?: string, to?: string }} [filters]
   * @param {string} [currency]
   * @returns {Promise<{ counterpartyId: string, currency: string, openingBalance: number, closingBalance: number, movements: object[] }>}
   */
  async getStatement(auth, counterpartyId, filters = {}, currency = "UZS") {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.#buildStatement(tx, auth, counterpartyId, filters, currency),
    );
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} counterpartyId
   * @param {{ from?: string, to?: string }} filters
   * @param {string} currency
   * @returns {Promise<{ counterpartyId: string, counterpartyName: string, currency: string, openingBalance: number, closingBalance: number, movements: object[], from?: string, to?: string }>}
   */
  async #buildStatement(tx, auth, counterpartyId, filters, currency) {
    const counterparty = await this.counterpartiesRepository.findById(tx, counterpartyId);
    if (!counterparty || counterparty.companyId !== auth.companyId) {
      throw new NotFoundError("Kontragent topilmadi");
    }
    await this.#assertCanView(tx, auth, counterpartyId);

    const from = filters.from ? new Date(filters.from) : null;
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : null;

    const openingBalance = from
      ? await this.debtMovementsRepository.sumBefore(
          tx,
          auth.companyId,
          counterpartyId,
          currency,
          from,
        )
      : 0;

    const rows = await this.debtMovementsRepository.listByCounterparty(
      tx,
      auth.companyId,
      counterpartyId,
      { currency, from: from ?? undefined, to: to ?? undefined },
    );

    let running = openingBalance;
    const movements = rows.map((row) => {
      running += Number(row.amount);
      return {
        id: row.id,
        type: row.type,
        orderNumber: row.order?.number ?? null,
        orderId: row.orderId,
        amount: Number(row.amount),
        currency: row.currency,
        dueDate: row.dueDate,
        createdAt: row.createdAt,
        balance: running,
      };
    });

    return {
      counterpartyId,
      counterpartyName: counterparty.name,
      currency,
      openingBalance,
      closingBalance: running,
      movements,
      from: filters.from,
      to: filters.to,
    };
  }

  /**
   * Akt sverki — `getStatement()` natijasini `pdfmake` bilan PDF'ga chiqaradi.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} counterpartyId
   * @param {{ from?: string, to?: string }} [filters]
   * @param {string} [currency]
   * @returns {Promise<Buffer>}
   */
  async getStatementPdf(auth, counterpartyId, filters = {}, currency = "UZS") {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const statement = await this.#buildStatement(tx, auth, counterpartyId, filters, currency);
      const company = await this.companiesRepository.findById(tx, auth.companyId);
      return renderDebtStatementPdf({ ...statement, companyName: company?.name ?? "" });
    });
  }

  /**
   * Kompaniya bo'yicha qarz yoshi hisoboti — faqat `debts.view`.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ asOf?: string }} [filters]
   * @returns {Promise<{ asOf: string, counterparties: object[] }>}
   */
  async getAging(auth, filters = {}) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      if (!(await this.#canViewAll(tx, auth))) {
        throw new ForbiddenError("Ruxsat yo'q");
      }
      const asOf = filters.asOf ? new Date(`${filters.asOf}T23:59:59.999Z`) : new Date();
      const movements = await this.debtMovementsRepository.listOrderLinkedMovements(
        tx,
        auth.companyId,
      );
      const openOrders = computeOpenOrderBalances(movements, asOf);

      const byCounterparty = new Map();
      for (const order of openOrders) {
        let entry = byCounterparty.get(order.counterpartyId);
        if (!entry) {
          entry = {
            counterpartyId: order.counterpartyId,
            counterpartyName: order.counterpartyName,
            buckets: Object.fromEntries(AGING_BUCKETS.map((b) => [b, 0])),
            total: 0,
            orders: [],
          };
          byCounterparty.set(order.counterpartyId, entry);
        }
        entry.buckets[order.bucket] += order.balance;
        entry.total += order.balance;
        entry.orders.push(order);
      }

      return { asOf: asOf.toISOString(), counterparties: [...byCounterparty.values()] };
    });
  }

  /**
   * Ochilish qoldig'i / qo'lda tuzatish — faqat `debts.manage`.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createDebtAdjustmentSchema._type} dto
   * @returns {Promise<import("@prisma/client").DebtMovement>}
   */
  async createAdjustment(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      if (!(await this.rolesRepository.hasPermission(tx, auth.roleId, MANAGE_PERMISSION))) {
        throw new ForbiddenError("Ruxsat yo'q");
      }
      const counterparty = await this.counterpartiesRepository.findById(tx, dto.counterpartyId);
      if (!counterparty || counterparty.companyId !== auth.companyId) {
        throw new NotFoundError("Kontragent topilmadi");
      }
      return this.debtMovementsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        counterpartyId: dto.counterpartyId,
        type: dto.type,
        amount: dto.amount,
        currency: dto.currency,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        createdBy: auth.userId,
      });
    });
  }

  /**
   * Joriy foydalanuvchining o'z sotuv nuqtasi qarzi (`apps/shop`).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} [currency]
   * @returns {Promise<{ counterpartyId: string, currency: string, balance: number }>}
   */
  async getMyBalance(auth, currency = "UZS") {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const counterpartyId = await this.#resolveOwnCounterpartyId(tx, auth);
      const balance = await this.debtMovementsRepository.getBalance(
        tx,
        auth.companyId,
        counterpartyId,
        currency,
      );
      return { counterpartyId, currency, balance };
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ from?: string, to?: string }} [filters]
   * @param {string} [currency]
   * @returns {Promise<object>}
   */
  async getMyStatement(auth, filters = {}, currency = "UZS") {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const counterpartyId = await this.#resolveOwnCounterpartyId(tx, auth);
      const counterparty = await this.counterpartiesRepository.findById(tx, counterpartyId);

      const from = filters.from ? new Date(filters.from) : null;
      const to = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : null;
      const openingBalance = from
        ? await this.debtMovementsRepository.sumBefore(
            tx,
            auth.companyId,
            counterpartyId,
            currency,
            from,
          )
        : 0;
      const rows = await this.debtMovementsRepository.listByCounterparty(
        tx,
        auth.companyId,
        counterpartyId,
        { currency, from: from ?? undefined, to: to ?? undefined },
      );
      let running = openingBalance;
      const movements = rows.map((row) => {
        running += Number(row.amount);
        return {
          id: row.id,
          type: row.type,
          orderNumber: row.order?.number ?? null,
          orderId: row.orderId,
          amount: Number(row.amount),
          currency: row.currency,
          dueDate: row.dueDate,
          createdAt: row.createdAt,
          balance: running,
        };
      });
      return {
        counterpartyId,
        counterpartyName: counterparty?.name ?? "",
        currency,
        openingBalance,
        closingBalance: running,
        movements,
      };
    });
  }

  /**
   * @param {import("@prisma/client").Prisma.TransactionClient} tx
   * @param {{ userId: string, companyId: string }} auth
   * @returns {Promise<string>}
   */
  async #resolveOwnCounterpartyId(tx, auth) {
    const salePointId = await this.userAssignmentsRepository.findSalePointIdForUser(
      tx,
      auth.companyId,
      auth.userId,
    );
    const salePoint = salePointId
      ? await this.salePointsRepository.findById(tx, salePointId)
      : null;
    if (!salePoint) {
      throw new ForbiddenError("Sotuv nuqtasiga biriktirilmagansiz");
    }
    return salePoint.counterpartyId;
  }
}
