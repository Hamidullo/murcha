import argon2 from "argon2";

/**
 * @param {string} plain
 * @returns {Promise<string>}
 */
export async function hashPassword(plain) {
  return argon2.hash(plain);
}

/**
 * @param {string} hash
 * @param {string} plain
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(hash, plain) {
  return argon2.verify(hash, plain);
}
