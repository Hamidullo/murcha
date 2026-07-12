import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { warehousesRouter } from "./modules/warehouses/warehouses.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { priceTypesRouter } from "./modules/price-types/price-types.routes.js";
import { unitsRouter } from "./modules/units/units.routes.js";
import { warehouseDocsRouter } from "./modules/warehouse-docs/warehouse-docs.routes.js";
import { stockRouter } from "./modules/stock/stock.routes.js";
import { purchaseOrdersRouter } from "./modules/purchase-orders/purchase-orders.routes.js";
import { counterpartiesRouter } from "./modules/counterparties/counterparties.routes.js";
import { exportsRouter } from "./modules/exports/exports.routes.js";
import { importsRouter } from "./modules/imports/imports.routes.js";
import { inventoryCountsRouter } from "./modules/inventory-counts/inventory-counts.routes.js";
import { salePointsRouter } from "./modules/sale-points/sale-points.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { shopCatalogRouter } from "./modules/shop-catalog/shop-catalog.routes.js";
import { companyMembersRouter } from "./modules/companies/company-members.routes.js";
import { rolesRouter } from "./modules/roles/roles.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { pushSubscriptionsRouter } from "./modules/push-subscriptions/push-subscriptions.routes.js";
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
  app.use("/api/v1/warehouses", warehousesRouter);
  app.use("/api/v1/categories", categoriesRouter);
  app.use("/api/v1/products", productsRouter);
  app.use("/api/v1/price-types", priceTypesRouter);
  app.use("/api/v1/units", unitsRouter);
  app.use("/api/v1/warehouse-docs", warehouseDocsRouter);
  app.use("/api/v1/stock", stockRouter);
  app.use("/api/v1/purchase-orders", purchaseOrdersRouter);
  app.use("/api/v1/counterparties", counterpartiesRouter);
  app.use("/api/v1/exports", exportsRouter);
  app.use("/api/v1/imports", importsRouter);
  app.use("/api/v1/inventory-counts", inventoryCountsRouter);
  app.use("/api/v1/sale-points", salePointsRouter);
  app.use("/api/v1/orders", ordersRouter);
  app.use("/api/v1/shop-catalog", shopCatalogRouter);
  app.use("/api/v1/company-members", companyMembersRouter);
  app.use("/api/v1/roles", rolesRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/push-subscriptions", pushSubscriptionsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: { code: "not_found", message: "Marshrut topilmadi" } });
  });

  if (env.sentryDsn) {
    Sentry.setupExpressErrorHandler(app);
  }
  app.use(errorHandler);

  return app;
}
