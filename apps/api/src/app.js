import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { Sentry } from "./lib/sentry.js";
import { env } from "./config/env.js";

/**
 * @returns {import("express").Express}
 */
export function createApp() {
  const app = express();

  app.use(helmet());
  // TODO(Faza 1+): frontend domenlari tayyor bo'lgach cors({ origin: [...], credentials: true })
  // oq ro'yxatiga o'tiladi (PLAN.md: "CORS oq ro'yxat app./shop. uchun").
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use(healthRouter);
  app.use("/api/v1/auth", authRouter);

  app.use((req, res) => {
    res.status(404).json({ error: { code: "not_found", message: "Marshrut topilmadi" } });
  });

  if (env.sentryDsn) {
    Sentry.setupExpressErrorHandler(app);
  }
  app.use(errorHandler);

  return app;
}
