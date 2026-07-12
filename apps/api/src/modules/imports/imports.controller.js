import multer from "multer";
import { ValidationError } from "../../lib/errors.js";

const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream", // ba'zi brauzerlar .xlsx uchun umumiy MIME yuboradi
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) && !file.originalname.endsWith(".xlsx")) {
      cb(new ValidationError("Faqat .xlsx fayl qabul qilinadi"));
      return;
    }
    cb(null, true);
  },
});

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class ImportsController {
  /**
   * @param {{ importsService: import("./imports.service.js").ImportsService }} deps
   */
  constructor({ importsService }) {
    this.importsService = importsService;
  }

  /**
   * `multer` middleware — `create`dan oldin marshrutga qo'shiladi.
   * @type {import("express").RequestHandler}
   */
  parseUpload = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        next(new ValidationError(err.message));
        return;
      }
      next(err);
    });
  };

  /**
   * `POST /api/v1/imports/:type`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("Fayl topilmadi (`file` maydoni)");
      }
      const result = await this.importsService.enqueue(req.auth, req.params.type, req.file);
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/imports/:jobId`
   * @type {import("express").RequestHandler}
   */
  getStatus = async (req, res, next) => {
    try {
      const status = await this.importsService.getStatus(req.auth, req.params.jobId);
      res.status(200).json(status);
    } catch (err) {
      next(err);
    }
  };
}
