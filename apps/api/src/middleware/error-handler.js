import { AppError } from "../lib/errors.js";

/**
 * Yagona xato-handler: klientga har doim bir xil JSON formatida javob
 * ({ error: { code, message, details? } }) — CLAUDE.md "Yagona xato tizimi".
 * @param {Error} err
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  req.log?.error({ err }, "kutilmagan xato");
  res.status(500).json({ error: { code: "internal_error", message: "Server xatosi" } });
}
