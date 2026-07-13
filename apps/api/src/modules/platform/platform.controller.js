/** HTTP qatlam (CLAUDE.md qatlam qoidasi). */
export class PlatformController {
  /**
   * @param {{ platformService: import("./platform.service.js").PlatformService }} deps
   */
  constructor({ platformService }) {
    this.platformService = platformService;
  }

  /**
   * `GET /api/v1/platform/companies`
   * @type {import("express").RequestHandler}
   */
  listCompanies = async (req, res, next) => {
    try {
      const companies = await this.platformService.listCompanies(req.query);
      res.status(200).json({ companies });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/platform/companies/:id`
   * @type {import("express").RequestHandler}
   */
  getCompany = async (req, res, next) => {
    try {
      const company = await this.platformService.getCompany(req.params.id);
      res.status(200).json(company);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/platform/companies/:id/subscription`
   * @type {import("express").RequestHandler}
   */
  updateSubscription = async (req, res, next) => {
    try {
      const subscription = await this.platformService.updateSubscription(req.params.id, req.body);
      res.status(200).json(subscription);
    } catch (err) {
      next(err);
    }
  };
}
