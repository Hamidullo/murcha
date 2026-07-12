import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import {
  createCashRegisterSchema,
  updateCashRegisterSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  createTransactionSchema,
  createTransferSchema,
  openCashShiftSchema,
  closeCashShiftSchema,
} from "./cash.schemas.js";
import { CashRegistersRepository } from "./cash-registers.repository.js";
import { ExpenseCategoriesRepository } from "./expense-categories.repository.js";
import { TransactionsRepository } from "./transactions.repository.js";
import { CashShiftsRepository } from "./cash-shifts.repository.js";
import { AuditLogsRepository } from "../audit-logs/audit-logs.repository.js";
import { CashService } from "./cash.service.js";
import { CashController } from "./cash.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const cashService = new CashService({
  cashRegistersRepository: new CashRegistersRepository(),
  expenseCategoriesRepository: new ExpenseCategoriesRepository(),
  transactionsRepository: new TransactionsRepository(),
  cashShiftsRepository: new CashShiftsRepository(),
  auditLogsRepository: new AuditLogsRepository(),
});
const cashController = new CashController({ cashService });

export const cashRouter = Router();
cashRouter.use(requireAuth);

cashRouter.post(
  "/registers",
  requirePermission("cash.manage"),
  validate(createCashRegisterSchema),
  cashController.createRegister,
);
cashRouter.get("/registers", requirePermission("cash.view"), cashController.listRegisters);
cashRouter.patch(
  "/registers/:id",
  requirePermission("cash.manage"),
  validate(updateCashRegisterSchema),
  cashController.updateRegister,
);

cashRouter.post(
  "/expense-categories",
  requirePermission("cash.manage"),
  validate(createExpenseCategorySchema),
  cashController.createExpenseCategory,
);
cashRouter.get(
  "/expense-categories",
  requirePermission("cash.view"),
  cashController.listExpenseCategories,
);
cashRouter.patch(
  "/expense-categories/:id",
  requirePermission("cash.manage"),
  validate(updateExpenseCategorySchema),
  cashController.updateExpenseCategory,
);

cashRouter.post(
  "/transactions",
  requirePermission("cash.manage"),
  validate(createTransactionSchema),
  cashController.createTransaction,
);
cashRouter.get("/transactions", requirePermission("cash.view"), cashController.listTransactions);
cashRouter.post(
  "/transfers",
  requirePermission("cash.manage"),
  validate(createTransferSchema),
  cashController.transfer,
);

cashRouter.post(
  "/registers/:id/shifts",
  requirePermission("cash.manage"),
  validate(openCashShiftSchema),
  cashController.openShift,
);
cashRouter.get("/registers/:id/shifts", requirePermission("cash.view"), cashController.listShifts);
cashRouter.patch(
  "/shifts/:id/close",
  requirePermission("cash.manage"),
  validate(closeCashShiftSchema),
  cashController.closeShift,
);
