import { verifyToken } from "../lib/jwt.js";
import { UnauthorizedError } from "../lib/errors.js";

/**
 * `Authorization: Bearer <access token>` headerini tekshiradi, muvaffaqiyatli
 * bo'lsa `req.auth = { userId, companyId, roleId }` o'rnatadi. Business
 * modullar (Faza 2+) shu `req.auth`dan `withTenant(companyId, userId, ...)`
 * chaqiradi — bu middleware o'zi tranzaksiya ochmaydi.
 * @type {import("express").RequestHandler}
 */
export function requireAuth(req, _res, next) {
  const header = req.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    next(new UnauthorizedError("Avtorizatsiya headeri yo'q"));
    return;
  }

  let decoded;
  try {
    decoded = verifyToken(header.slice("Bearer ".length));
  } catch {
    next(new UnauthorizedError("Token yaroqsiz yoki muddati o'tgan"));
    return;
  }
  if (decoded.type !== "access") {
    next(new UnauthorizedError("Noto'g'ri token turi"));
    return;
  }

  req.auth = { userId: decoded.userId, companyId: decoded.companyId, roleId: decoded.roleId };
  next();
}
