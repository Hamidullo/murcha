/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class ProductVariantsController {
  /**
   * @param {{ productVariantsService: import("./product-variants.service.js").ProductVariantsService }} deps
   */
  constructor({ productVariantsService }) {
    this.productVariantsService = productVariantsService;
  }

  /**
   * `POST /api/v1/products/:id/variants`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const variant = await this.productVariantsService.create(req.auth, req.params.id, req.body);
      res.status(201).json(variant);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products/:id/variants`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const variants = await this.productVariantsService.list(req.auth, req.params.id);
      res.status(200).json({ variants });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products/:id/variants/:variantId`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const variant = await this.productVariantsService.getById(
        req.auth,
        req.params.id,
        req.params.variantId,
      );
      res.status(200).json(variant);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/products/:id/variants/:variantId`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const variant = await this.productVariantsService.update(
        req.auth,
        req.params.id,
        req.params.variantId,
        req.body,
      );
      res.status(200).json(variant);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/products/:id/variants/:variantId` — soft-delete.
   * @type {import("express").RequestHandler}
   */
  archive = async (req, res, next) => {
    try {
      await this.productVariantsService.archive(req.auth, req.params.id, req.params.variantId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
