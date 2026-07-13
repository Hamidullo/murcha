import { verifyToken } from "../lib/jwt.js";
import { UnauthorizedError } from "../lib/errors.js";

/**
 * `require-auth.js`dagi bilan bir xil naqsh, lekin `companyId`/`roleId`siz —
 * platform-admin hech qanday kompaniyaga bog'lanmagan. Muvaffaqiyatli
 * bo'lsa `req.platformAuth = { userId }` o'rnatadi.
 * @type {import("express").RequestHandler}
 */
export function requirePlatformAdmin(req, _res, next) {
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
  if (decoded.type !== "platform_access") {
    next(new UnauthorizedError("Noto'g'ri token turi"));
    return;
  }

  req.platformAuth = { userId: decoded.userId };
  next();
}
