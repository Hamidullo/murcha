const OTP_TTL_SECONDS = 3 * 60;

/**
 * O'z-o'zini parolni tiklash uchun 6 xonali OTP kod (Redis, `otp:{phone}`
 * hash — `code`+`attempts`). 3 daqiqa amal qiladi (PLAN.md: "SMS OTP,
 * muddat + urinish limiti").
 */
export class OtpRepository {
  /**
   * @param {import("ioredis").Redis} redis
   */
  constructor(redis) {
    this.redis = redis;
  }

  /**
   * @param {string} phone
   * @returns {Promise<string>} yaratilgan 6 xonali kod
   */
  async create(phone) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const key = `otp:${phone}`;
    await this.redis.hset(key, { code, attempts: "0" });
    await this.redis.expire(key, OTP_TTL_SECONDS);
    return code;
  }

  /**
   * @param {string} phone
   * @returns {Promise<{ code: string, attempts: number } | null>}
   */
  async get(phone) {
    const data = await this.redis.hgetall(`otp:${phone}`);
    if (!data || !data.code) {
      return null;
    }
    return { code: data.code, attempts: Number(data.attempts ?? 0) };
  }

  /**
   * @param {string} phone
   * @returns {Promise<void>}
   */
  async incrementAttempts(phone) {
    await this.redis.hincrby(`otp:${phone}`, "attempts", 1);
  }

  /**
   * @param {string} phone
   * @returns {Promise<void>}
   */
  async delete(phone) {
    await this.redis.del(`otp:${phone}`);
  }
}
