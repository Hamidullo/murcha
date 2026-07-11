import { withTenant } from "../lib/tenant-context.js";
import { ForbiddenError } from "../lib/errors.js";
import { RolesRepository } from "../modules/roles/roles.repository.js";

const rolesRepository = new RolesRepository();

/**
 * `requireAuth`dan keyin ishlaydi (`req.auth` kerak). `role_permissions`
 * orqali joriy rol shu ruxsatga ega ekanini tekshiradi (CLAUDE.md: RBAC
 * middleware darajasida, frontend'dagi yashirish faqat UX uchun).
 * @param {string} code
 * @returns {import("express").RequestHandler}
 */
export function requirePermission(code) {
  return async (req, _res, next) => {
    try {
      const allowed = await withTenant(req.auth.companyId, req.auth.userId, (tx) =>
        rolesRepository.hasPermission(tx, req.auth.roleId, code),
      );
      if (!allowed) {
        next(new ForbiddenError(`Ruxsat yo'q: ${code}`));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
