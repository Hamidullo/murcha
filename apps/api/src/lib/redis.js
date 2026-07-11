import Redis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export const redis = new Redis(env.redisUrl);

redis.on("error", (err) => {
  logger.error({ err }, "Redis ulanish xatosi");
});
