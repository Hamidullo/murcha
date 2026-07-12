/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class PriceTypesController {
  /**
   * @param {{ priceTypesService: import("./price-types.service.js").PriceTypesService }} deps
   */
  constructor({ priceTypesService }) {
    this.priceTypesService = priceTypesService;
  }

  /**
   * `POST /api/v1/price-types`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const priceType = await this.priceTypesService.create(req.auth, req.body);
      res.status(201).json(priceType);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/price-types`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const priceTypes = await this.priceTypesService.list(req.auth);
      res.status(200).json({ priceTypes });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/price-types/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const priceType = await this.priceTypesService.getById(req.auth, req.params.id);
      res.status(200).json(priceType);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/price-types/:id`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const priceType = await this.priceTypesService.update(req.auth, req.params.id, req.body);
      res.status(200).json(priceType);
    } catch (err) {
      next(err);
    }
  };
}
