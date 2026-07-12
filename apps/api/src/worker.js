import sharp from "sharp";
import ExcelJS from "exceljs";
import { Worker } from "bullmq";
import { uuidv7 } from "uuidv7";
import {
  queueConnection,
  THUMBNAIL_QUEUE_NAME,
  IMPORT_QUEUE_NAME,
  DEBT_REMINDER_QUEUE_NAME,
  debtReminderQueue,
  CBU_RATE_QUEUE_NAME,
  cbuRateQueue,
} from "./lib/queue.js";
import { minioClient, MINIO_BUCKET, ensureBucket } from "./lib/minio.js";
import { prisma } from "./lib/prisma.js";
import { withTenant } from "./lib/tenant-context.js";
import { logger } from "./lib/logger.js";
import { listActiveCompanies } from "./lib/companies-registry.js";
import { computeOpenOrderBalances } from "./lib/debt-netting.js";
import { ProductsRepository } from "./modules/products/products.repository.js";
import { CategoriesRepository } from "./modules/categories/categories.repository.js";
import { UnitsRepository } from "./modules/units/units.repository.js";
import { WarehousesRepository } from "./modules/warehouses/warehouses.repository.js";
import { CounterpartiesRepository } from "./modules/counterparties/counterparties.repository.js";
import { WarehouseDocsRepository } from "./modules/warehouse-docs/warehouse-docs.repository.js";
import { StockRepository } from "./modules/stock/stock.repository.js";
import { StockMovementsRepository } from "./modules/stock/stock-movements.repository.js";
import { SalePointsRepository } from "./modules/sale-points/sale-points.repository.js";
import { CompaniesRepository } from "./modules/companies/companies.repository.js";
import { DebtMovementsRepository } from "./modules/debts/debts.repository.js";
import { ExchangeRatesRepository } from "./modules/exchange-rates/exchange-rates.repository.js";
import { NotificationsRepository } from "./modules/notifications/notifications.repository.js";
import { CompanyMembersRepository } from "./modules/companies/company-members.repository.js";
import { RolesRepository } from "./modules/roles/roles.repository.js";
import { PushSubscriptionsRepository } from "./modules/push-subscriptions/push-subscriptions.repository.js";
import { UserAssignmentsRepository } from "./modules/user-assignments/user-assignments.repository.js";
import { NotificationsService } from "./modules/notifications/notifications.service.js";
import {
  importProductRow,
  importStockRow,
  importCounterpartyRow,
} from "./modules/imports/import-processors.js";

const DEFAULT_DUE_SOON_DAYS = 3;

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

const debtMovementsRepository = new DebtMovementsRepository();
const salePointsRepository = new SalePointsRepository();
const companiesRepository = new CompaniesRepository();
const exchangeRatesRepository = new ExchangeRatesRepository();
const CBU_API_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/";
// `worker.js` alohida process — `domainEvents` (in-process EventEmitter)
// unga yetib bormaydi, shuning uchun `notifications` moduli composition
// root'ini (`notifications.routes.js`dagi bilan bir xil) o'zi quradi.
const notificationsService = new NotificationsService({
  notificationsRepository: new NotificationsRepository(),
  companyMembersRepository: new CompanyMembersRepository(),
  rolesRepository: new RolesRepository(),
  pushSubscriptionsRepository: new PushSubscriptionsRepository(),
  userAssignmentsRepository: new UserAssignmentsRepository(),
});

/**
 * Har kompaniya uchun ochiq order-qarzlarni skanerlaydi, muddati
 * yaqinlashgan (`dueSoonDays` ichida)/o'tgan orderlar uchun eslatma
 * yaratadi. `companies` jadvali RLS bilan himoyalangan — kompaniyalar
 * ro'yxati Redis'dan olinadi (`lib/companies-registry.js`), har biri uchun
 * alohida `withTenant` ochiladi (RLS bypass kerak emas).
 * @returns {Promise<{ companies: number, reminders: number }>}
 */
async function processDebtReminderJob() {
  const companyIds = await listActiveCompanies();
  const now = new Date();
  let reminders = 0;

  for (const companyId of companyIds) {
    await withTenant(companyId, null, async (tx) => {
      const company = await companiesRepository.findById(tx, companyId);
      const dueSoonDays = company?.settings?.debtReminderDueSoonDays ?? DEFAULT_DUE_SOON_DAYS;

      const movements = await debtMovementsRepository.listOrderLinkedMovements(tx, companyId);
      const openOrders = computeOpenOrderBalances(movements, now);

      for (const order of openOrders) {
        if (!order.dueDate) continue;
        const bucket =
          order.ageDays > 0 ? "overdue" : order.ageDays >= -dueSoonDays ? "due_soon" : null;
        if (!bucket) continue;

        const salePoint = await salePointsRepository.findByCounterpartyId(tx, order.counterpartyId);
        await notificationsService.notifyDebtReminder({
          companyId,
          counterpartyId: order.counterpartyId,
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          salePointId: salePoint?.id ?? null,
          amount: order.balance,
          currency: order.currency,
          bucket,
        });
        reminders += 1;
      }
    });
  }

  return { companies: companyIds.length, reminders };
}

/**
 * CBU'ning "DD.MM.YYYY" formatidagi sanasini UTC yarim tunga o'giradi.
 * @param {string} dateStr
 * @returns {Date}
 */
function parseCbuDate(dateStr) {
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * CBU (cbu.uz) ochiq JSON API'dan USD rasmiy kursini oladi, `exchange_rates`ga
 * `companyId:null` bilan yozadi (RLS bu qatorlarni har doim o'tkazadi —
 * `rls.sql`: `company_id IS NULL OR ...`, tenant kontekst kerak emas).
 * Tarmoq/format xatosida jim o'tkazib yuboriladi — oldingi kunning kursi
 * `ExchangeRatesRepository.findLatest`da `rateDate <= bugun` bilan ishlaydi.
 * @returns {Promise<void>}
 */
async function processCbuRateJob() {
  try {
    const res = await fetch(CBU_API_URL);
    if (!res.ok) {
      throw new Error(`CBU API xato: ${res.status}`);
    }
    const rates = await res.json();
    const usd = Array.isArray(rates) ? rates.find((r) => r.Ccy === "USD") : null;
    if (!usd) {
      throw new Error("CBU javobida USD topilmadi");
    }
    await exchangeRatesRepository.upsert(prisma, {
      id: uuidv7(),
      companyId: null,
      currency: "USD",
      rate: parseFloat(usd.Rate),
      rateDate: parseCbuDate(usd.Date),
    });
  } catch (err) {
    logger.error({ err }, "CBU kursini olishda xato — o'tkazib yuborildi");
  }
}

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

// `jobId` bilan qayta chaqirilsa BullMQ dublikat repeat job yaratmaydi —
// worker har safar ishga tushganda shu chaqiruv idempotent.
debtReminderQueue.add(
  "scan",
  {},
  { repeat: { pattern: "0 8 * * *" }, jobId: "debt-reminder-daily" },
);
const debtReminderWorker = new Worker(DEBT_REMINDER_QUEUE_NAME, processDebtReminderJob, {
  connection: queueConnection,
});
debtReminderWorker.on("failed", (job, err) => {
  logger.error({ err, jobId: job?.id }, "Qarz eslatmalarini yuborishda xato");
});

cbuRateQueue.add("fetch", {}, { repeat: { pattern: "0 7 * * *" }, jobId: "cbu-rate-daily" });
const cbuRateWorker = new Worker(CBU_RATE_QUEUE_NAME, processCbuRateJob, {
  connection: queueConnection,
});
cbuRateWorker.on("failed", (job, err) => {
  logger.error({ err, jobId: job?.id }, "CBU kurs job'i kutilmagan xato bilan yiqildi");
});

logger.info(
  `murcha worker — "${THUMBNAIL_QUEUE_NAME}", "${IMPORT_QUEUE_NAME}", "${DEBT_REMINDER_QUEUE_NAME}" va "${CBU_RATE_QUEUE_NAME}" navbatlari tinglanmoqda`,
);
