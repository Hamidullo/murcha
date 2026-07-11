import { redis } from "../lib/redis.js";
import { TooManyRequestsError } from "../lib/errors.js";

/**
 * IP bo'yicha fixed-window rate-limit (Redis INCR+EXPIRE). CLAUDE.md/PLAN.md:
 * "rate-limit (Redis asosida, IP + user bo'yicha)".
 * @param {{ windowSeconds: number, max: number, keyPrefix: string }} options
 * @returns {import("express").RequestHandler}
 */
export function rateLimit({ windowSeconds, max, keyPrefix }) {
  return async (req, _res, next) => {
    try {
      const key = `${keyPrefix}:${req.ip}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      if (count > max) {
        next(new TooManyRequestsError());
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
