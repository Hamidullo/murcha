import { minioClient, MINIO_BUCKET } from "../../lib/minio.js";

const MIME_BY_EXTENSION = {
  png: "image/png",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/**
 * Kompaniya logosini MinIO'dan o'qib base64 data URI'ga aylantiradi
 * (`pdfmake`ning `images` lug'ati shu formatni to'g'ridan-to'g'ri qabul
 * qiladi). Logo yo'q yoki o'qishda xato bo'lsa `null` — hujjat logo'siz
 * chop etiladi, xatosiz davom etadi.
 * @param {import("@prisma/client").Company | null} company
 * @returns {Promise<string | null>}
 */
export async function loadCompanyLogoBase64(company) {
  if (!company?.logoPath) {
    return null;
  }
  try {
    const stream = await minioClient.getObject(MINIO_BUCKET, company.logoPath);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const extension = company.logoPath.split(".").pop()?.toLowerCase();
    const mime = MIME_BY_EXTENSION[extension] ?? "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
