import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import {
  registerSchema,
  loginSchema,
  selectCompanySchema,
  setPasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { UsersRepository } from "../users/users.repository.js";
import { CompaniesRepository } from "../companies/companies.repository.js";
import { CompanyMembersRepository } from "../companies/company-members.repository.js";
import { RolesRepository } from "../roles/roles.repository.js";
import { SessionsRepository } from "../sessions/sessions.repository.js";
import { LoginAttemptsRepository } from "./login-attempts.repository.js";
import { PasswordResetRepository } from "./password-reset.repository.js";
import { OtpRepository } from "./otp.repository.js";
import { WarehousesRepository } from "../warehouses/warehouses.repository.js";
import { UnitsRepository } from "../units/units.repository.js";
import { ProductsRepository } from "../products/products.repository.js";
import { CounterpartiesRepository } from "../counterparties/counterparties.repository.js";
import { PriceTypesRepository } from "../price-types/price-types.repository.js";
import { SalePointsRepository } from "../sale-points/sale-points.repository.js";
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
  passwordResetRepository: new PasswordResetRepository(redis),
  otpRepository: new OtpRepository(redis),
  warehousesRepository: new WarehousesRepository(),
  unitsRepository: new UnitsRepository(),
  productsRepository: new ProductsRepository(),
  counterpartiesRepository: new CounterpartiesRepository(),
  priceTypesRepository: new PriceTypesRepository(),
  salePointsRepository: new SalePointsRepository(),
});
const authController = new AuthController({ authService });

// IP bo'yicha umumiy himoya (login endpoint eng ko'p nishonlanadi); telefon
// bo'yicha aniqroq brute-force bloki AuthService.login() ichida (PLAN.md).
const loginRateLimit = rateLimit({ windowSeconds: 5 * 60, max: 20, keyPrefix: "rl:login" });
// Autentifikatsiyasiz DB yozuv (user+company+subscription) — ommaviy
// soxta ro'yxatdan o'tish/resurs sarflashning oldini olish (Faza 12
// xavfsizlik auditi topdi: `/register` hech qanday rate-limit'siz edi).
const registerRateLimit = rateLimit({ windowSeconds: 60 * 60, max: 10, keyPrefix: "rl:register" });
// SMS OTP spam'ining oldini olish — IP bo'yicha, telefon bo'yicha esa OTP
// urinish limiti (`MAX_OTP_ATTEMPTS`) `AuthService.resetPasswordWithOtp()`da.
const forgotPasswordRateLimit = rateLimit({
  windowSeconds: 15 * 60,
  max: 5,
  keyPrefix: "rl:forgot-password",
});

export const authRouter = Router();
authRouter.post("/register", registerRateLimit, validate(registerSchema), authController.register);
authRouter.post("/login", loginRateLimit, validate(loginSchema), authController.login);
authRouter.post("/select-company", validate(selectCompanySchema), authController.selectCompany);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/sessions", authController.listSessions);
authRouter.delete("/sessions/:id", authController.revokeSession);
authRouter.get("/me", requireAuth, authController.me);
authRouter.post("/set-password", validate(setPasswordSchema), authController.setPassword);
authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);
