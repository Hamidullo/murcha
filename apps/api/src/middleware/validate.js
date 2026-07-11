import { ValidationError } from "../lib/errors.js";

/**
 * `req.body`ni Zod sxema bilan tekshiradi; muvaffaqiyatli bo'lsa parse
 * qilingan (coerced) qiymat bilan almashtiradi.
 * @param {import("zod").ZodType} schema
 * @returns {import("express").RequestHandler}
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError("Noto'g'ri so'rov", result.error.issues));
      return;
    }
    req.body = result.data;
    next();
  };
}
