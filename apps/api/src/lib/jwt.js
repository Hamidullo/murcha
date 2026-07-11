import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * @returns {string}
 */
function requireSecret() {
  if (!env.jwtAccessSecret) {
    throw new Error("JWT_ACCESS_SECRET sozlanmagan (.env)");
  }
  return env.jwtAccessSecret;
}

/**
 * @param {{ userId: string, companyId: string, roleId: string }} payload
 * @returns {string}
 */
export function signAccessToken(payload) {
  return jwt.sign({ ...payload, type: "access" }, requireSecret(), {
    expiresIn: env.jwtAccessExpiresIn,
  });
}

/**
 * Kompaniya tanlanmagan holatdagi vaqtinchalik token (login → select-company
 * oralig'ida, foydalanuvchi bir nechta kompaniyaga a'zo bo'lganda).
 * @param {{ userId: string }} payload
 * @returns {string}
 */
export function signPendingToken(payload) {
  return jwt.sign({ ...payload, type: "pending" }, requireSecret(), { expiresIn: "5m" });
}

/**
 * @param {string} token
 * @returns {{ userId: string, companyId?: string, roleId?: string, type: "access" | "pending", iat: number, exp: number }}
 */
export function verifyToken(token) {
  return /** @type {any} */ (jwt.verify(token, requireSecret()));
}
