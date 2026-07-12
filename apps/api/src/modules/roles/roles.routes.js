import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createRoleSchema, updateRoleSchema, setRolePermissionsSchema } from "./roles.schemas.js";
import { RolesRepository } from "./roles.repository.js";
import { RolesService } from "./roles.service.js";
import { RolesController } from "./roles.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const rolesService = new RolesService({ rolesRepository: new RolesRepository() });
const rolesController = new RolesController({ rolesService });

export const rolesRouter = Router();
rolesRouter.use(requireAuth);

rolesRouter.post(
  "/",
  requirePermission("employees.manage"),
  validate(createRoleSchema),
  rolesController.create,
);
rolesRouter.get("/", rolesController.list);
rolesRouter.get("/permissions", rolesController.listAllPermissions);
rolesRouter.patch(
  "/:id",
  requirePermission("employees.manage"),
  validate(updateRoleSchema),
  rolesController.update,
);
rolesRouter.get("/:id/permissions", rolesController.listPermissions);
rolesRouter.put(
  "/:id/permissions",
  requirePermission("employees.manage"),
  validate(setRolePermissionsSchema),
  rolesController.setPermissions,
);
