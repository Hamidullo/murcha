import { generateOpaqueToken } from "../../lib/opaque-token.js";

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

/**
 * Bir martalik parol-o'rnatish tokeni (Redis, `pwreset:{token}` → `userId`).
 * Uchta joyda qayta ishlatiladi: yangi hodim taklifi, ega tomonidan majburiy
 * tiklash, taklif linki (CLAUDE.md/PLAN.md — SMS/link orqali kirish).
 */
export class PasswordResetRepository {
  /**
   * @param {import("ioredis").Redis} redis
   */
  constructor(redis) {
    this.redis = redis;
  }

  /**
   * @param {string} userId
   * @returns {Promise<string>} yaratilgan token
   */
  async createToken(userId) {
    const token = generateOpaqueToken();
    await this.redis.set(`pwreset:${token}`, userId, "EX", TOKEN_TTL_SECONDS);
    return token;
  }

  /**
   * Tokenni bir martalik iste'mol qiladi — o'qilgach darhol o'chiriladi.
   * @param {string} token
   * @returns {Promise<string | null>} `userId` yoki topilmasa `null`
   */
  async consumeToken(token) {
    const userId = await this.redis.get(`pwreset:${token}`);
    if (userId) {
      await this.redis.del(`pwreset:${token}`);
    }
    return userId;
  }
}
