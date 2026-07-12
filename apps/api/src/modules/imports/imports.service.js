import { uuidv7 } from "uuidv7";
import { minioClient, MINIO_BUCKET } from "../../lib/minio.js";
import { importQueue } from "../../lib/queue.js";
import { ValidationError, NotFoundError } from "../../lib/errors.js";

const IMPORT_TYPES = new Set(["products", "stock", "counterparties"]);

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). Fayl MinIO'ga yoziladi (tarmoq
 * I/O — Prisma tranzaksiyasi ichida ushlab turilmaydi, `product-images`
 * patterniga o'xshab), BullMQ job navbatga qo'yiladi — haqiqiy qator
 * qayta ishlash `apps/api/src/worker.js`da (`import-processors.js`).
 */
export class ImportsService {
  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} type
   * @param {{ buffer: Buffer, size: number, mimetype: string }} file
   * @returns {Promise<{ jobId: string }>}
   */
  async enqueue(auth, type, file) {
    if (!IMPORT_TYPES.has(type)) {
      throw new ValidationError(`Noto'g'ri import turi: ${type}`);
    }

    const path = `imports/${auth.companyId}/${uuidv7()}.xlsx`;
    await minioClient.putObject(MINIO_BUCKET, path, file.buffer, file.size, {
      "Content-Type": file.mimetype,
    });

    const job = await importQueue.add("import", {
      type,
      path,
      companyId: auth.companyId,
      userId: auth.userId,
    });

    return { jobId: job.id };
  }

  /**
   * Job'ning `companyId`si so'ragan foydalanuvchining kompaniyasiga mos
   * kelmasa — boshqa kompaniya import natijasini ko'rish imkoni
   * bo'lmasligi uchun (BullMQ/Redis'da RLS yo'q) `NotFoundError`.
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} jobId
   * @returns {Promise<{ id: string, state: string, result: object | null, failedReason: string | null }>}
   */
  async getStatus(auth, jobId) {
    const job = await importQueue.getJob(jobId);
    if (!job || job.data.companyId !== auth.companyId) {
      throw new NotFoundError("Import topilmadi");
    }
    const state = await job.getState();
    return {
      id: String(job.id),
      state,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    };
  }
}
