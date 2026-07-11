import { env } from "../../config/env.js";

const TTL_SECONDS = env.refreshTokenTtlDays * 24 * 60 * 60;

/**
 * Faqat Redis operatsiyalari (CLAUDE.md repository qatlami printsipi —
 * Prisma'ga xos emas, lekin bir xil qoida: "faqat saqlash so'rovlari, biznes
 * qaror yo'q"). Refresh token rotation + sessiyalar shu yerda saqlanadi
 * (PLAN.md: "refresh token rotation, Redis'da, o'g'irlansa butun zanjir
 * bekor qilinadi").
 *
 * Kalitlar: `session:{id}` (JSON metadata), `refresh:{id}` (joriy refresh
 * token qiymati), `user_sessions:{userId}` (set — foydalanuvchining barcha
 * sessiya ID'lari, "sessiyalar ro'yxati" uchun).
 */
export class SessionsRepository {
  /**
   * @param {import("ioredis").Redis} redis
   */
  constructor(redis) {
    this.redis = redis;
  }

  /**
   * @param {string} sessionId
   * @param {{ userId: string, companyId: string, roleId: string, refreshToken: string, userAgent?: string, ip?: string }} data
   * @returns {Promise<void>}
   */
  async create(sessionId, data) {
    const { refreshToken, ...meta } = data;
    const payload = JSON.stringify({ ...meta, createdAt: new Date().toISOString() });
    await this.redis
      .multi()
      .set(`session:${sessionId}`, payload, "EX", TTL_SECONDS)
      .set(`refresh:${sessionId}`, refreshToken, "EX", TTL_SECONDS)
      .sadd(`user_sessions:${data.userId}`, sessionId)
      .expire(`user_sessions:${data.userId}`, TTL_SECONDS)
      .exec();
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<{ userId: string, companyId: string, roleId: string, userAgent?: string, ip?: string, createdAt: string } | null>}
   */
  async getSession(sessionId) {
    const raw = await this.redis.get(`session:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<string | null>}
   */
  async getRefreshToken(sessionId) {
    return this.redis.get(`refresh:${sessionId}`);
  }

  /**
   * Rotation — TTL to'liq oyna bilan yangilanadi (sliding expiration).
   * @param {string} sessionId
   * @param {string} newRefreshToken
   * @returns {Promise<void>}
   */
  async rotateRefreshToken(sessionId, newRefreshToken) {
    await this.redis
      .multi()
      .set(`refresh:${sessionId}`, newRefreshToken, "EX", TTL_SECONDS)
      .expire(`session:${sessionId}`, TTL_SECONDS)
      .exec();
  }

  /**
   * @param {string} sessionId
   * @param {string} [userId]
   * @returns {Promise<void>}
   */
  async revoke(sessionId, userId) {
    await this.redis.del(`session:${sessionId}`, `refresh:${sessionId}`);
    if (userId) {
      await this.redis.srem(`user_sessions:${userId}`, sessionId);
    }
  }

  /**
   * @param {string} userId
   * @returns {Promise<Array<{ id: string, userAgent?: string, ip?: string, createdAt: string }>>}
   */
  async listByUser(userId) {
    const ids = await this.redis.smembers(`user_sessions:${userId}`);
    const sessions = await Promise.all(
      ids.map(async (id) => {
        const session = await this.getSession(id);
        return session ? { id, ...session } : null;
      }),
    );
    return sessions.filter((s) => s !== null);
  }
}
