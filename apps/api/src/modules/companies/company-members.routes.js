import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createEmployeeSchema, updateEmployeeSchema } from "./company-members.schemas.js";
import { CompanyMembersRepository } from "./company-members.repository.js";
import { UsersRepository } from "../users/users.repository.js";
import { RolesRepository } from "../roles/roles.repository.js";
import { UserAssignmentsRepository } from "../user-assignments/user-assignments.repository.js";
import { SessionsRepository } from "../sessions/sessions.repository.js";
import { PasswordResetRepository } from "../auth/password-reset.repository.js";
import { redis } from "../../lib/redis.js";
import { CompanyMembersService } from "./company-members.service.js";
import { CompanyMembersController } from "./company-members.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const companyMembersService = new CompanyMembersService({
  companyMembersRepository: new CompanyMembersRepository(),
  usersRepository: new UsersRepository(),
  rolesRepository: new RolesRepository(),
  userAssignmentsRepository: new UserAssignmentsRepository(),
  sessionsRepository: new SessionsRepository(redis),
  passwordResetRepository: new PasswordResetRepository(redis),
});
const companyMembersController = new CompanyMembersController({ companyMembersService });

export const companyMembersRouter = Router();
companyMembersRouter.use(requireAuth);

companyMembersRouter.post(
  "/",
  requirePermission("employees.manage"),
  validate(createEmployeeSchema),
  companyMembersController.create,
);
companyMembersRouter.get("/", requirePermission("employees.manage"), companyMembersController.list);
companyMembersRouter.get(
  "/:id",
  requirePermission("employees.manage"),
  companyMembersController.getById,
);
companyMembersRouter.patch(
  "/:id",
  requirePermission("employees.manage"),
  validate(updateEmployeeSchema),
  companyMembersController.update,
);
companyMembersRouter.post(
  "/:id/reset-password",
  requirePermission("employees.manage"),
  companyMembersController.resetPassword,
);
