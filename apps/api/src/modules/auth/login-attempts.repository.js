const LOCKOUT_WINDOW_SECONDS = 15 * 60;

/**
 * Brute-force himoya — telefon bo'yicha noto'g'ri urinishlar sanaladi
 * (PLAN.md: "5 marta xato urinishdan keyin vaqtinchalik bloklash"). IP
 * bo'yicha umumiy rate-limit alohida (`middleware/rate-limit.js`) — bu
 * ikkinchi, aniqroq qavat: bitta telefon raqami turli IP'lardan urinsa ham
 * ushlanadi.
 */
export class LoginAttemptsRepository {
  /**
   * @param {import("ioredis").Redis} redis
   */
  constructor(redis) {
    this.redis = redis;
  }

  /**
   * @param {string} phone
   * @returns {Promise<number>}
   */
  async recordFailure(phone) {
    const key = `login_fail:${phone}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, LOCKOUT_WINDOW_SECONDS);
    }
    return count;
  }

  /**
   * @param {string} phone
   * @returns {Promise<number>}
   */
  async getFailureCount(phone) {
    const raw = await this.redis.get(`login_fail:${phone}`);
    return raw ? Number(raw) : 0;
  }

  /**
   * @param {string} phone
   * @returns {Promise<void>}
   */
  async reset(phone) {
    await this.redis.del(`login_fail:${phone}`);
  }
}
