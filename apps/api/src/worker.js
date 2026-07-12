import sharp from "sharp";
import { Worker } from "bullmq";
import { queueConnection, THUMBNAIL_QUEUE_NAME } from "./lib/queue.js";
import { minioClient, MINIO_BUCKET, ensureBucket } from "./lib/minio.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";

const THUMBNAIL_WIDTH = 300;

/**
 * Stream'ni to'liq Bufferga yig'adi (MinIO `getObject` Node.js Readable
 * qaytaradi).
 * @param {import("stream").Readable} stream
 * @returns {Promise<Buffer>}
 */
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * `product_images` jadvalida RLS yo'q (bola-jadval, `company_id` ustuni
 * yo'q — rls.sql) — worker HTTP so'rovsiz ishlagani uchun `withTenant`
 * kerak emas, `prisma` to'g'ridan-to'g'ri ishlatiladi (DATABASE.md 9-bo'lim
 * istisnosi bilan bir xil mantiq).
 * @param {import("bullmq").Job<{ imageId: string, path: string }>} job
 * @returns {Promise<void>}
 */
async function processThumbnailJob(job) {
  const { imageId, path } = job.data;
  const original = await minioClient.getObject(MINIO_BUCKET, path);
  const buffer = await streamToBuffer(original);
  const thumbBuffer = await sharp(buffer)
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .toBuffer();

  const thumbPath = path.replace(/(\.[^./]+)$/, "-thumb$1");
  await minioClient.putObject(MINIO_BUCKET, thumbPath, thumbBuffer);
  await prisma.productImage.update({ where: { id: imageId }, data: { thumbPath } });
}

ensureBucket();

const worker = new Worker(THUMBNAIL_QUEUE_NAME, processThumbnailJob, {
  connection: queueConnection,
});

worker.on("failed", (job, err) => {
  logger.error({ err, jobId: job?.id }, "Rasm thumbnail generatsiyasi xato");
});

logger.info(`murcha worker — "${THUMBNAIL_QUEUE_NAME}" navbati tinglanmoqda`);
