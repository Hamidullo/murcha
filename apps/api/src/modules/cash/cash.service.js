import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError, ValidationError, ConflictError } from "../../lib/errors.js";

/** Yopiq tomonga ishora qiluvchi tur — smena balansini netto qilishda. */
const INFLOW_TYPES = new Set(["income", "transfer_in"]);
const OUTFLOW_TYPES = new Set(["expense", "transfer_out"]);

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Repository interfeyslarga
 * konstruktor orqali bog'lanadi (DI), testda mock qo'yiladi.
 */
export class CashService {
  /**
   * @param {{
   *   cashRegistersRepository: import("./cash-registers.repository.js").CashRegistersRepository,
   *   expenseCategoriesRepository: import("./expense-categories.repository.js").ExpenseCategoriesRepository,
   *   transactionsRepository: import("./transactions.repository.js").TransactionsRepository,
   *   cashShiftsRepository: import("./cash-shifts.repository.js").CashShiftsRepository,
   * }} deps
   */
  constructor({
    cashRegistersRepository,
    expenseCategoriesRepository,
    transactionsRepository,
    cashShiftsRepository,
  }) {
    this.cashRegistersRepository = cashRegistersRepository;
    this.expenseCategoriesRepository = expenseCategoriesRepository;
    this.transactionsRepository = transactionsRepository;
    this.cashShiftsRepository = cashShiftsRepository;
  }

  // ---- Cash registers ----

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createCashRegisterSchema._type} dto
   * @returns {Promise<import("@prisma/client").CashRegister>}
   */
  async createRegister(auth, dto) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.cashRegistersRepository.create(tx, { id: uuidv7(), companyId: auth.companyId, ...dto }),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").CashRegister[]>}
   */
  async listRegisters(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.cashRegistersRepository.list(tx, auth.companyId),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updateCashRegisterSchema._type} dto
   * @returns {Promise<import("@prisma/client").CashRegister>}
   */
  async updateRegister(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.cashRegistersRepository.findById(tx, id);
      if (!existing) {
        throw new NotFoundError("Kassa topilmadi");
      }
      return this.cashRegistersRepository.update(tx, id, dto);
    });
  }

  // ---- Expense categories ----

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createExpenseCategorySchema._type} dto
   * @returns {Promise<import("@prisma/client").ExpenseCategory>}
   */
  async createExpenseCategory(auth, dto) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.expenseCategoriesRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        ...dto,
      }),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @returns {Promise<import("@prisma/client").ExpenseCategory[]>}
   */
  async listExpenseCategories(auth) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.expenseCategoriesRepository.list(tx, auth.companyId),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @param {import("@murcha/shared").updateExpenseCategorySchema._type} dto
   * @returns {Promise<import("@prisma/client").ExpenseCategory>}
   */
  async updateExpenseCategory(auth, id, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.expenseCategoriesRepository.findById(tx, id);
      if (!existing) {
        throw new NotFoundError("Xarajat kategoriyasi topilmadi");
      }
      return this.expenseCategoriesRepository.update(tx, id, dto);
    });
  }

  // ---- Transactions ----

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createTransactionSchema._type} dto
   * @returns {Promise<import("@prisma/client").Transaction>}
   */
  async createTransaction(auth, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const register = await this.cashRegistersRepository.findById(tx, dto.cashRegisterId);
      if (!register) {
        throw new NotFoundError("Kassa topilmadi");
      }
      if (dto.categoryId) {
        const category = await this.expenseCategoriesRepository.findById(tx, dto.categoryId);
        if (!category) {
          throw new NotFoundError("Xarajat kategoriyasi topilmadi");
        }
      }
      return this.transactionsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        cashRegisterId: dto.cashRegisterId,
        type: dto.type,
        categoryId: dto.categoryId ?? null,
        counterpartyId: dto.counterpartyId ?? null,
        amount: dto.amount,
        currency: dto.currency,
        exchangeRate: dto.exchangeRate ?? null,
        comment: dto.comment ?? null,
        createdBy: auth.userId,
        occurredAt: dto.occurredAt ?? new Date(),
      });
    });
  }

  /**
   * Ikkita kassa o'rtasida ko'chirish — bitta tranzaksiyada ikkita `Transaction`
   * yozuvi (`transfer_out` manbada, `transfer_in` qabul qiluvchida).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createTransferSchema._type} dto
   * @returns {Promise<{ out: import("@prisma/client").Transaction, in: import("@prisma/client").Transaction }>}
   */
  async transfer(auth, dto) {
    if (dto.fromCashRegisterId === dto.toCashRegisterId) {
      throw new ValidationError("Manba va qabul qiluvchi kassa bir xil bo'lishi mumkin emas");
    }
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const [from, to] = await Promise.all([
        this.cashRegistersRepository.findById(tx, dto.fromCashRegisterId),
        this.cashRegistersRepository.findById(tx, dto.toCashRegisterId),
      ]);
      if (!from || !to) {
        throw new NotFoundError("Kassa topilmadi");
      }
      const occurredAt = dto.occurredAt ?? new Date();
      const out = await this.transactionsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        cashRegisterId: dto.fromCashRegisterId,
        type: "transfer_out",
        amount: dto.amount,
        currency: dto.currency,
        comment: dto.comment ?? null,
        createdBy: auth.userId,
        occurredAt,
      });
      const incoming = await this.transactionsRepository.create(tx, {
        id: uuidv7(),
        companyId: auth.companyId,
        cashRegisterId: dto.toCashRegisterId,
        type: "transfer_in",
        amount: dto.amount,
        currency: dto.currency,
        comment: dto.comment ?? null,
        createdBy: auth.userId,
        occurredAt,
      });
      return { out, in: incoming };
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").listTransactionsQuerySchema._type} filters
   * @returns {Promise<import("@prisma/client").Transaction[]>}
   */
  async listTransactions(auth, filters) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.transactionsRepository.list(tx, auth.companyId, filters),
    );
  }

  // ---- Cash shifts (kun yopish) ----

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} cashRegisterId
   * @param {import("@murcha/shared").openCashShiftSchema._type} dto
   * @returns {Promise<import("@prisma/client").CashShift>}
   */
  async openShift(auth, cashRegisterId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const register = await this.cashRegistersRepository.findById(tx, cashRegisterId);
      if (!register || register.companyId !== auth.companyId) {
        throw new NotFoundError("Kassa topilmadi");
      }
      const openShift = await this.cashShiftsRepository.findOpenByRegister(tx, cashRegisterId);
      if (openShift) {
        throw new ConflictError("Bu kassada allaqachon ochiq smena bor");
      }
      return this.cashShiftsRepository.create(tx, {
        id: uuidv7(),
        cashRegisterId,
        openedBy: auth.userId,
        openedAt: new Date(),
        openingBalance: dto.openingBalance,
      });
    });
  }

  /**
   * `expectedBalance = openingBalance + SUM(income/transfer_in) - SUM(expense/transfer_out)`,
   * shu registerda `[openedAt, hozir)` oralig'ida. `diff = countedBalance - expectedBalance`.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} shiftId
   * @param {import("@murcha/shared").closeCashShiftSchema._type} dto
   * @returns {Promise<import("@prisma/client").CashShift>}
   */
  async closeShift(auth, shiftId, dto) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const shift = await this.cashShiftsRepository.findById(tx, shiftId);
      if (!shift) {
        throw new NotFoundError("Smena topilmadi");
      }
      const register = await this.cashRegistersRepository.findById(tx, shift.cashRegisterId);
      if (!register || register.companyId !== auth.companyId) {
        throw new NotFoundError("Smena topilmadi");
      }
      if (shift.closedAt) {
        throw new ConflictError("Smena allaqachon yopilgan");
      }
      const transactions = await this.transactionsRepository.list(tx, auth.companyId, {
        cashRegisterId: shift.cashRegisterId,
        from: shift.openedAt,
      });
      const expectedBalance = this.#computeExpectedBalance(shift.openingBalance, transactions);
      const countedBalance = dto.countedBalance;
      return this.cashShiftsRepository.update(tx, shiftId, {
        expectedBalance,
        countedBalance,
        diff: countedBalance - expectedBalance,
        closedBy: auth.userId,
        closedAt: new Date(),
        comment: dto.comment ?? null,
      });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} cashRegisterId
   * @returns {Promise<import("@prisma/client").CashShift[]>}
   */
  async listShifts(auth, cashRegisterId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const register = await this.cashRegistersRepository.findById(tx, cashRegisterId);
      if (!register || register.companyId !== auth.companyId) {
        throw new NotFoundError("Kassa topilmadi");
      }
      return this.cashShiftsRepository.listByRegister(tx, cashRegisterId);
    });
  }

  /**
   * @param {number | import("@prisma/client/runtime/library").Decimal} openingBalance
   * @param {Array<{ type: string, amount: number | import("@prisma/client/runtime/library").Decimal }>} transactions
   * @returns {number}
   */
  #computeExpectedBalance(openingBalance, transactions) {
    return transactions.reduce((sum, t) => {
      const amount = Number(t.amount);
      if (INFLOW_TYPES.has(t.type)) return sum + amount;
      if (OUTFLOW_TYPES.has(t.type)) return sum - amount;
      return sum;
    }, Number(openingBalance));
  }
}
