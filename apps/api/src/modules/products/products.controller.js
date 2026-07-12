/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class ProductsController {
  /**
   * @param {{ productsService: import("./products.service.js").ProductsService }} deps
   */
  constructor({ productsService }) {
    this.productsService = productsService;
  }

  /**
   * `POST /api/v1/products`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const product = await this.productsService.create(req.auth, req.body);
      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const products = await this.productsService.list(req.auth);
      res.status(200).json({ products });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const product = await this.productsService.getById(req.auth, req.params.id);
      res.status(200).json(product);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/products/:id`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const product = await this.productsService.update(req.auth, req.params.id, req.body);
      res.status(200).json(product);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/products/:id` — soft-delete (archive).
   * @type {import("express").RequestHandler}
   */
  archive = async (req, res, next) => {
    try {
      await this.productsService.archive(req.auth, req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
