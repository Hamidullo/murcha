import multer from "multer";
import { ValidationError } from "../../lib/errors.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new ValidationError("Faqat JPEG/PNG/WEBP rasm qabul qilinadi"));
      return;
    }
    cb(null, true);
  },
});

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class ProductImagesController {
  /**
   * @param {{ productImagesService: import("./product-images.service.js").ProductImagesService }} deps
   */
  constructor({ productImagesService }) {
    this.productImagesService = productImagesService;
  }

  /**
   * `multer` middleware — `create`dan oldin marshrutga qo'shiladi.
   * `MulterError` (masalan fayl hajmi limitdan oshsa) `ValidationError`ga
   * o'giriladi — `error-handler.js` faqat `AppError` ierarxiyasini biladi.
   * @type {import("express").RequestHandler}
   */
  parseUpload = (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        next(new ValidationError(err.message));
        return;
      }
      next(err);
    });
  };

  /**
   * `POST /api/v1/products/:id/images`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("Rasm fayli topilmadi (`image` maydoni)");
      }
      const image = await this.productImagesService.uploadImage(req.auth, req.params.id, req.file);
      res.status(201).json(image);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products/:id/images`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const images = await this.productImagesService.listImages(req.auth, req.params.id);
      res.status(200).json({ images });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/products/:id/images/:imageId/main`
   * @type {import("express").RequestHandler}
   */
  setMain = async (req, res, next) => {
    try {
      const image = await this.productImagesService.setMain(
        req.auth,
        req.params.id,
        req.params.imageId,
      );
      res.status(200).json(image);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/products/:id/images/:imageId`
   * @type {import("express").RequestHandler}
   */
  delete = async (req, res, next) => {
    try {
      await this.productImagesService.deleteImage(req.auth, req.params.id, req.params.imageId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
