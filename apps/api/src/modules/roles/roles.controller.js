/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class RolesController {
  /**
   * @param {{ rolesService: import("./roles.service.js").RolesService }} deps
   */
  constructor({ rolesService }) {
    this.rolesService = rolesService;
  }

  /**
   * `POST /api/v1/roles`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const role = await this.rolesService.create(req.auth, req.body);
      res.status(201).json(role);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/roles`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const roles = await this.rolesService.list(req.auth);
      res.status(200).json({ roles });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/roles/permissions`
   * @type {import("express").RequestHandler}
   */
  listAllPermissions = async (req, res, next) => {
    try {
      const permissions = await this.rolesService.listAllPermissions(req.auth);
      res.status(200).json({ permissions });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/roles/:id`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const role = await this.rolesService.update(req.auth, req.params.id, req.body);
      res.status(200).json(role);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/roles/:id/permissions`
   * @type {import("express").RequestHandler}
   */
  listPermissions = async (req, res, next) => {
    try {
      const permissionIds = await this.rolesService.listPermissions(req.auth, req.params.id);
      res.status(200).json({ permissionIds });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PUT /api/v1/roles/:id/permissions`
   * @type {import("express").RequestHandler}
   */
  setPermissions = async (req, res, next) => {
    try {
      await this.rolesService.setPermissions(req.auth, req.params.id, req.body);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
