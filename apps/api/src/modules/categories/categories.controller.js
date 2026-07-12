/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class CategoriesController {
  /**
   * @param {{ categoriesService: import("./categories.service.js").CategoriesService }} deps
   */
  constructor({ categoriesService }) {
    this.categoriesService = categoriesService;
  }

  /**
   * `POST /api/v1/categories`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const category = await this.categoriesService.create(req.auth, req.body);
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/categories`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const categories = await this.categoriesService.list(req.auth);
      res.status(200).json({ categories });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/categories/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const category = await this.categoriesService.getById(req.auth, req.params.id);
      res.status(200).json(category);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/categories/:id`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const category = await this.categoriesService.update(req.auth, req.params.id, req.body);
      res.status(200).json(category);
    } catch (err) {
      next(err);
    }
  };
}
