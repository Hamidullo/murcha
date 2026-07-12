/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class SalePointsController {
  /**
   * @param {{ salePointsService: import("./sale-points.service.js").SalePointsService }} deps
   */
  constructor({ salePointsService }) {
    this.salePointsService = salePointsService;
  }

  /**
   * `POST /api/v1/sale-points`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const salePoint = await this.salePointsService.create(req.auth, req.body);
      res.status(201).json(salePoint);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/sale-points`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const salePoints = await this.salePointsService.list(req.auth);
      res.status(200).json({ salePoints });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/sale-points/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const salePoint = await this.salePointsService.getById(req.auth, req.params.id);
      res.status(200).json(salePoint);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/sale-points/:id`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const salePoint = await this.salePointsService.update(req.auth, req.params.id, req.body);
      res.status(200).json(salePoint);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/sale-points/:id/operators`
   * @type {import("express").RequestHandler}
   */
  listOperators = async (req, res, next) => {
    try {
      const operators = await this.salePointsService.listOperators(req.auth, req.params.id);
      res.status(200).json({ operators });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/sale-points/:id/operators`
   * @type {import("express").RequestHandler}
   */
  assignOperator = async (req, res, next) => {
    try {
      const assignment = await this.salePointsService.assignOperator(
        req.auth,
        req.params.id,
        req.body.phone,
      );
      res.status(201).json(assignment);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/sale-points/:id/operators/:userId`
   * @type {import("express").RequestHandler}
   */
  unassignOperator = async (req, res, next) => {
    try {
      await this.salePointsService.unassignOperator(req.auth, req.params.id, req.params.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
