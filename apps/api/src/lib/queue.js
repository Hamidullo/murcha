import IORedis from "ioredis";
import { Queue } from "bullmq";
import { env } from "../config/env.js";

/**
 * BullMQ o'z ulanishini talab qiladi (`maxRetriesPerRequest: null`) —
 * umumiy `lib/redis.js` klienti bilan bo'lishilmaydi.
 */
export const queueConnection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

export const THUMBNAIL_QUEUE_NAME = "product-image-thumbnail";

export const thumbnailQueue = new Queue(THUMBNAIL_QUEUE_NAME, { connection: queueConnection });

export const IMPORT_QUEUE_NAME = "excel-import";

export const importQueue = new Queue(IMPORT_QUEUE_NAME, { connection: queueConnection });
