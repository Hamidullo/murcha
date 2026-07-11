import { randomBytes } from "node:crypto";

/**
 * Refresh token — JWT emas, tasodifiy opaque satr (Redis'da saqlanadi,
 * server tomonda darhol bekor qilinishi mumkin — DATABASE.md/PLAN.md
 * "o'g'irlansa butun zanjir bekor qilinadi").
 * @returns {string}
 */
export function generateOpaqueToken() {
  return randomBytes(32).toString("hex");
}
