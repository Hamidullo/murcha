import sharp from "sharp";
import ExcelJS from "exceljs";
import { Worker } from "bullmq";
import { queueConnection, THUMBNAIL_QUEUE_NAME, IMPORT_QUEUE_NAME } from "./lib/queue.js";
import { minioClient, MINIO_BUCKET, ensureBucket } from "./lib/minio.js";
import { prisma } from "./lib/prisma.js";
import { withTenant } from "./lib/tenant-context.js";
import { logger } from "./lib/logger.js";
import { ProductsRepository } from "./modules/products/products.repository.js";
import { CategoriesRepository } from "./modules/categories/categories.repository.js";
import { UnitsRepository } from "./modules/units/units.repository.js";
import { WarehousesRepository } from "./modules/warehouses/warehouses.repository.js";
import { CounterpartiesRepository } from "./modules/counterparties/counterparties.repository.js";
import { WarehouseDocsRepository } from "./modules/warehouse-docs/warehouse-docs.repository.js";
import { StockRepository } from "./modules/stock/stock.repository.js";
import { StockMovementsRepository } from "./modules/stock/stock-movements.repository.js";
import {
  importProductRow,
  importStockRow,
  importCounterpartyRow,
} from "./modules/imports/import-processors.js";

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

const importRepos = {
  productsRepository: new ProductsRepository(),
  categoriesRepository: new CategoriesRepository(),
  unitsRepository: new UnitsRepository(),
  warehousesRepository: new WarehousesRepository(),
  counterpartiesRepository: new CounterpartiesRepository(),
  warehouseDocsRepository: new WarehouseDocsRepository(),
  stockRepository: new StockRepository(),
  stockMovementsRepository: new StockMovementsRepository(),
};

/**
 * Har qator o'z alohida `withTenant` tranzaksiyasida qayta ishlanadi — bitta
 * qatorning xatosi qolganlarini to'xtatmaydi (natija hisoboti: qancha
 * muvaffaqiyatli, qancha xato, har xato uchun qator raqami + sabab).
 * @param {import("bullmq").Job<{ type: string, path: string, companyId: string, userId: string }>} job
 * @returns {Promise<{ total: number, succeeded: number, failed: number, errors: Array<{ row: number, message: string }> }>}
 */
async function processImportJob(job) {
  const { type, path, companyId, userId } = job.data;
  const original = await minioClient.getObject(MINIO_BUCKET, path);
  const buffer = await streamToBuffer(original);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    rows.push({ rowNumber, values: row.values });
  });

  const result = { total: rows.length, succeeded: 0, failed: 0, errors: [] };

  for (const { rowNumber, values } of rows) {
    try {
      await withTenant(companyId, userId, (tx) => {
        if (type === "products") {
          return importProductRow(tx, importRepos, companyId, {
            sku: values[1],
            nameUz: values[2],
            categoryName: values[3],
            unitName: values[4],
            status: values[5],
          });
        }
        if (type === "stock") {
          return importStockRow(tx, importRepos, companyId, userId, {
            warehouseName: values[1],
            sku: values[3],
            quantity: values[4],
          });
        }
        if (type === "counterparties") {
          return importCounterpartyRow(tx, importRepos, companyId, {
            type: values[1],
            name: values[2],
            phone: values[3],
            tin: values[4],
            creditLimit: values[5],
            paymentTermDays: values[6],
          });
        }
        throw new Error(`Noma'lum import turi: ${type}`);
      });
      result.succeeded += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({ row: rowNumber, message: err.message });
    }
  }

  await minioClient.removeObject(MINIO_BUCKET, path);
  return result;
}

ensureBucket();

const thumbnailWorker = new Worker(THUMBNAIL_QUEUE_NAME, processThumbnailJob, {
  connection: queueConnection,
});
thumbnailWorker.on("failed", (job, err) => {
  logger.error({ err, jobId: job?.id }, "Rasm thumbnail generatsiyasi xato");
});

const importWorker = new Worker(IMPORT_QUEUE_NAME, processImportJob, {
  connection: queueConnection,
});
importWorker.on("failed", (job, err) => {
  logger.error({ err, jobId: job?.id }, "Excel import xato");
});

logger.info(
  `murcha worker — "${THUMBNAIL_QUEUE_NAME}" va "${IMPORT_QUEUE_NAME}" navbatlari tinglanmoqda`,
);
