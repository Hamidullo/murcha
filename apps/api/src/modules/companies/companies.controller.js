import multer from "multer";
import { ValidationError } from "../../lib/errors.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

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
export class CompaniesController {
  /**
   * @param {{ companiesService: import("./companies.service.js").CompaniesService }} deps
   */
  constructor({ companiesService }) {
    this.companiesService = companiesService;
  }

  /**
   * `multer` middleware — `uploadLogo`dan oldin marshrutga qo'shiladi.
   * @type {import("express").RequestHandler}
   */
  parseUpload = (req, res, next) => {
    upload.single("logo")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        next(new ValidationError(err.message));
        return;
      }
      next(err);
    });
  };

  /**
   * `GET /api/v1/companies/me`
   * @type {import("express").RequestHandler}
   */
  getMe = async (req, res, next) => {
    try {
      const company = await this.companiesService.getMe(req.auth);
      res.status(200).json(company);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/companies/me`
   * @type {import("express").RequestHandler}
   */
  updateMe = async (req, res, next) => {
    try {
      const company = await this.companiesService.updateMe(req.auth, req.body);
      res.status(200).json(company);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/companies/me/logo`
   * @type {import("express").RequestHandler}
   */
  uploadLogo = async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("Logo fayli topilmadi (`logo` maydoni)");
      }
      const company = await this.companiesService.uploadLogo(req.auth, req.file);
      res.status(200).json(company);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/companies/me/logo/url` — vaqtinchalik imzolangan URL.
   * @type {import("express").RequestHandler}
   */
  getLogoUrl = async (req, res, next) => {
    try {
      const result = await this.companiesService.getLogoUrl(req.auth);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
