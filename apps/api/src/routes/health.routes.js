import { Router } from "express";
import Redis from "ioredis";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/healthz", async (_req, res) => {
  const checks = { db: false, redis: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch {
    checks.db = false;
  }

  const redis = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  redis.on("error", () => {}); // aks holda ioredis "unhandled error event" bilan qichqiradi — pastdagi catch yetarli
  try {
    await redis.connect();
    await redis.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  } finally {
    redis.disconnect();
  }

  const ok = checks.db && checks.redis;
  res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded", checks });
});
