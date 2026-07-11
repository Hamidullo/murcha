import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { registerSchema, loginSchema, selectCompanySchema } from "./auth.schemas.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { UsersRepository } from "../users/users.repository.js";
import { CompaniesRepository } from "../companies/companies.repository.js";
import { CompanyMembersRepository } from "../companies/company-members.repository.js";
import { RolesRepository } from "../roles/roles.repository.js";
import { SessionsRepository } from "../sessions/sessions.repository.js";
import { LoginAttemptsRepository } from "./login-attempts.repository.js";
import { redis } from "../../lib/redis.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md: "awilix yoki qo'lda
// factory, NestJS og'irligisiz"). Repository/service shu yerda bog'lanadi;
// controller/service o'zi hech qachon konkret repository klassini bilmaydi.
const authService = new AuthService({
  usersRepository: new UsersRepository(),
  companiesRepository: new CompaniesRepository(),
  companyMembersRepository: new CompanyMembersRepository(),
  rolesRepository: new RolesRepository(),
  sessionsRepository: new SessionsRepository(redis),
  loginAttemptsRepository: new LoginAttemptsRepository(redis),
});
const authController = new AuthController({ authService });

// IP bo'yicha umumiy himoya (login endpoint eng ko'p nishonlanadi); telefon
// bo'yicha aniqroq brute-force bloki AuthService.login() ichida (PLAN.md).
const loginRateLimit = rateLimit({ windowSeconds: 5 * 60, max: 20, keyPrefix: "rl:login" });

export const authRouter = Router();
authRouter.post("/register", validate(registerSchema), authController.register);
authRouter.post("/login", loginRateLimit, validate(loginSchema), authController.login);
authRouter.post("/select-company", validate(selectCompanySchema), authController.selectCompany);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/sessions", authController.listSessions);
authRouter.delete("/sessions/:id", authController.revokeSession);
authRouter.get("/me", requireAuth, authController.me);
