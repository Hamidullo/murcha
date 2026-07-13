import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { loginSchema } from "./platform-auth.schemas.js";
import { PlatformAuthService } from "./platform-auth.service.js";
import { PlatformAuthController } from "./platform-auth.controller.js";
import { UsersRepository } from "../users/users.repository.js";
import { LoginAttemptsRepository } from "../auth/login-attempts.repository.js";
import { redis } from "../../lib/redis.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const platformAuthService = new PlatformAuthService({
  usersRepository: new UsersRepository(),
  loginAttemptsRepository: new LoginAttemptsRepository(redis),
});
const platformAuthController = new PlatformAuthController({ platformAuthService });

// IP bo'yicha umumiy himoya (auth.routes.js loginRateLimit naqshi).
const loginRateLimit = rateLimit({
  windowSeconds: 5 * 60,
  max: 20,
  keyPrefix: "rl:platform-login",
});

export const platformAuthRouter = Router();
platformAuthRouter.post(
  "/login",
  loginRateLimit,
  validate(loginSchema),
  platformAuthController.login,
);
