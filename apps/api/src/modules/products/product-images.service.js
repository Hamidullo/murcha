import { uuidv7 } from "uuidv7";
import { withTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";
import { minioClient, MINIO_BUCKET } from "../../lib/minio.js";
import { thumbnailQueue } from "../../lib/queue.js";

const EXTENSION_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). MinIO/BullMQ chaqiruvlari
 * (tarmoq I/O) Prisma tranzaksiyasi ichida ushlab turilmaydi — `auth.service`
 * dagi Redis sessiya yaratish patterniga o'xshab, DB tekshiruvi alohida
 * qisqa tranzaksiyada, tashqi I/O undan tashqarida.
 */
export class ProductImagesService {
  /**
   * @param {{
   *   productImagesRepository: import("./product-images.repository.js").ProductImagesRepository,
   *   productsRepository: import("./products.repository.js").ProductsRepository,
   * }} deps
   */
  constructor({ productImagesRepository, productsRepository }) {
    this.productImagesRepository = productImagesRepository;
    this.productsRepository = productsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {{ buffer: Buffer, size: number, mimetype: string }} file
   * @returns {Promise<import("@prisma/client").ProductImage>}
   */
  async uploadImage(auth, productId, file) {
    const product = await withTenant(auth.companyId, auth.userId, (tx) =>
      this.productsRepository.findById(tx, productId),
    );
    if (!product) {
      throw new NotFoundError("Mahsulot topilmadi");
    }

    const extension = EXTENSION_BY_MIME[file.mimetype] ?? "jpg";
    const imageId = uuidv7();
    const path = `products/${productId}/${imageId}.${extension}`;
    await minioClient.putObject(MINIO_BUCKET, path, file.buffer, file.size, {
      "Content-Type": file.mimetype,
    });

    const created = await withTenant(auth.companyId, auth.userId, async (tx) => {
      const existing = await this.productImagesRepository.list(tx, productId);
      return this.productImagesRepository.create(tx, {
        id: imageId,
        productId,
        path,
        isMain: existing.length === 0,
        sort: existing.length,
      });
    });

    await thumbnailQueue.add("generate", { imageId: created.id, path });

    return created;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @returns {Promise<import("@prisma/client").ProductImage[]>}
   */
  async listImages(auth, productId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      return this.productImagesRepository.list(tx, productId);
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {string} imageId
   * @returns {Promise<import("@prisma/client").ProductImage>}
   */
  async setMain(auth, productId, imageId) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      const image = await this.productImagesRepository.findById(tx, imageId);
      if (!image || image.productId !== productId) {
        throw new NotFoundError("Rasm topilmadi");
      }
      await this.productImagesRepository.unsetMain(tx, productId, imageId);
      return this.productImagesRepository.update(tx, imageId, { isMain: true });
    });
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {string} imageId
   * @returns {Promise<void>}
   */
  async deleteImage(auth, productId, imageId) {
    const image = await withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      const found = await this.productImagesRepository.findById(tx, imageId);
      if (!found || found.productId !== productId) {
        throw new NotFoundError("Rasm topilmadi");
      }
      return found;
    });

    await minioClient.removeObject(MINIO_BUCKET, image.path);
    if (image.thumbPath) {
      await minioClient.removeObject(MINIO_BUCKET, image.thumbPath);
    }

    await withTenant(auth.companyId, auth.userId, (tx) =>
      this.productImagesRepository.delete(tx, imageId),
    );
  }

  /**
   * MinIO bucket'i ochiq emas — vaqtinchalik imzolangan URL orqali
   * ko'rsatiladi (frontend `<img>` shu URL'ni ishlatadi).
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} productId
   * @param {string} imageId
   * @returns {Promise<{ url: string }>}
   */
  async getUrl(auth, productId, imageId) {
    const image = await withTenant(auth.companyId, auth.userId, async (tx) => {
      const product = await this.productsRepository.findById(tx, productId);
      if (!product) {
        throw new NotFoundError("Mahsulot topilmadi");
      }
      const found = await this.productImagesRepository.findById(tx, imageId);
      if (!found || found.productId !== productId) {
        throw new NotFoundError("Rasm topilmadi");
      }
      return found;
    });

    const url = await minioClient.presignedGetObject(
      MINIO_BUCKET,
      image.path,
      PRESIGNED_URL_TTL_SECONDS,
    );
    return { url };
  }
}
