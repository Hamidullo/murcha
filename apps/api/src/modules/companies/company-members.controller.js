/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class CompanyMembersController {
  /**
   * @param {{ companyMembersService: import("./company-members.service.js").CompanyMembersService }} deps
   */
  constructor({ companyMembersService }) {
    this.companyMembersService = companyMembersService;
  }

  /**
   * `POST /api/v1/company-members`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const member = await this.companyMembersService.create(req.auth, req.body);
      res.status(201).json(member);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/company-members`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const members = await this.companyMembersService.list(req.auth);
      res.status(200).json({ members });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/company-members/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const member = await this.companyMembersService.getById(req.auth, req.params.id);
      res.status(200).json(member);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/company-members/:id`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const member = await this.companyMembersService.update(req.auth, req.params.id, req.body);
      res.status(200).json(member);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/company-members/:id/reset-password`
   * @type {import("express").RequestHandler}
   */
  resetPassword = async (req, res, next) => {
    try {
      await this.companyMembersService.resetPassword(req.auth, req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
