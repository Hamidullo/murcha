import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../lib/errors.js";
import { computeOpenOrderBalances } from "../../lib/debt-netting.js";

const MANAGE_PERMISSION = "debts.manage";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). To'lov yaratish — faqat
 * `debts.manage`. `dto.allocations` berilmasa avtomatik FIFO (eng eski
 * `dueDate`dan boshlab ochiq order qoldiqlariga taqsimlanadi), berilsa
 * qo'lda (har biri ochiq qoldiqdan oshmasligi tekshiriladi). Taqsimlanmagan
 * qoldiq (ortiqcha to'lov) `orderId:null` bilan alohida kamaytiruvchi
 * `debt_movement` sifatida yoziladi — `payment.amount`ning har so'mi
 * jurnalga tushishi shart (balans invarianti, DATABASE.md).
 */
export class PaymentsService {
  /**
   * @param {{
   *   paymentsRepository: import("./payments.repository.js").PaymentsRepository,
   *   debtMovementsRepository: import("../debts/debts.repository.js").DebtMovementsRepository,
   *   counterpartiesRepository: import("../counterparties/counterparties.repository.js").CounterpartiesRepository,
   *   rolesRepository: import("../roles/roles.repository.js").RolesRepository,
   * }} deps
   */
  constructor({
    paymentsRepository,
    debtMovementsRepository,
    counterpartiesRepository,
    rolesRepository,
  }) {
    this.paymentsRepository = paymentsRepository;
    this.debtMovementsRepository = debtMovementsRepository;
    this.counterpartiesRepository = counterpartiesRepository;
    this.rolesRepository = rolesRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createPaymentSchema._type} dto
   * @returns {Promise<import("@prisma/client").Payment>}
   */
  async create(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      if (!(await this.rolesRepository.hasPermission(tx, auth.roleId, MANAGE_PERMISSION))) {
        throw new ForbiddenError("Ruxsat yo'q");
      }
      const counterparty = await this.counterpartiesRepository.findById(tx, dto.counterpartyId);
      if (!counterparty || counterparty.companyId !== auth.companyId) {
        throw new NotFoundError("Kontragent topilmadi");
      }

      const payment = await this.paymentsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        counterpartyId: dto.counterpartyId,
        amount: dto.amount,
        currency: dto.currency,
        method: dto.method,
        receivedBy: auth.userId,
        deliveryId: dto.deliveryId ?? null,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      });

      const movements = await this.debtMovementsRepository.listOrderLinkedMovements(
        tx,
        auth.companyId,
        {
          counterpartyId: dto.counterpartyId,
        },
      );
      const openBalances = computeOpenOrderBalances(movements, new Date());

      const allocations = dto.allocations?.length
        ? this.#validateManualAllocations(dto.allocations, dto.amount, openBalances)
        : this.#allocateFifo(dto.amount, openBalances);

      for (const alloc of allocations) {
        await this.paymentsRepository.addAllocation(tx, {
          id: uuidv7(),
          paymentId: payment.id,
          orderId: alloc.orderId,
          amount: alloc.amount,
        });
        await this.debtMovementsRepository.create(tx, {
          id: uuidv7(),
          companyId: auth.companyId,
          counterpartyId: dto.counterpartyId,
          type: "payment",
          orderId: alloc.orderId,
          paymentId: payment.id,
          amount: -alloc.amount,
          currency: dto.currency,
          createdBy: auth.userId,
        });
      }

      const allocated = allocations.reduce((sum, a) => sum + a.amount, 0);
      const leftover = dto.amount - allocated;
      if (leftover > 0) {
        await this.debtMovementsRepository.create(tx, {
          id: uuidv7(),
          companyId: auth.companyId,
          counterpartyId: dto.counterpartyId,
          type: "payment",
          orderId: null,
          paymentId: payment.id,
          amount: -leftover,
          currency: dto.currency,
          createdBy: auth.userId,
        });
      }

      return payment;
    });
  }

  /**
   * @param {Array<{ orderId: string, amount: number }>} allocations
   * @param {number} paymentAmount
   * @param {Array<{ orderId: string, balance: number }>} openBalances
   * @returns {Array<{ orderId: string, amount: number }>}
   */
  #validateManualAllocations(allocations, paymentAmount, openBalances) {
    const byOrderId = new Map(openBalances.map((b) => [b.orderId, b.balance]));
    let sum = 0;
    for (const alloc of allocations) {
      const openBalance = byOrderId.get(alloc.orderId);
      if (openBalance == null) {
        throw new NotFoundError(`Ochiq qarz topilmadi: ${alloc.orderId}`);
      }
      if (alloc.amount > openBalance) {
        throw new ValidationError("Taqsimlangan summa ochiq qarzdan ko'p bo'lishi mumkin emas");
      }
      sum += alloc.amount;
    }
    if (sum > paymentAmount) {
      throw new ValidationError("Taqsimlangan summa to'lov summasidan ko'p bo'lishi mumkin emas");
    }
    return allocations;
  }

  /**
   * @param {number} amount
   * @param {Array<{ orderId: string, balance: number, dueDate: Date | null }>} openBalances
   * @returns {Array<{ orderId: string, amount: number }>}
   */
  #allocateFifo(amount, openBalances) {
    const sorted = [...openBalances].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    let remaining = amount;
    const allocations = [];
    for (const ob of sorted) {
      if (remaining <= 0) break;
      const applyAmount = Math.min(remaining, ob.balance);
      allocations.push({ orderId: ob.orderId, amount: applyAmount });
      remaining -= applyAmount;
    }
    return allocations;
  }
}
