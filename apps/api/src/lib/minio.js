import { Client } from "minio";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export const MINIO_BUCKET = env.minioBucket;

export const minioClient = new Client({
  endPoint: env.minioEndpoint,
  port: env.minioPort,
  useSSL: false,
  accessKey: env.minioRootUser,
  secretKey: env.minioRootPassword,
});

/**
 * Ilova ishga tushganda bucket mavjudligini tekshiradi, bo'lmasa yaratadi.
 * MinIO mahalliy mashinada ishlamasa xatoni log qilib davom etadi
 * (`/healthz` shu kabi degradatsiyani allaqachon aks ettiradi).
 * @returns {Promise<void>}
 */
export async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET);
    }
  } catch (err) {
    logger.error({ err }, "MinIO bucket tekshiruvi/yaratilishi muvaffaqiyatsiz");
  }
}
