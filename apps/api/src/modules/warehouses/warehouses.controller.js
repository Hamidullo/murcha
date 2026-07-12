/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class WarehousesController {
  /**
   * @param {{ warehousesService: import("./warehouses.service.js").WarehousesService }} deps
   */
  constructor({ warehousesService }) {
    this.warehousesService = warehousesService;
  }

  /**
   * `POST /api/v1/warehouses`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const warehouse = await this.warehousesService.create(req.auth, req.body);
      res.status(201).json(warehouse);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/warehouses`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const warehouses = await this.warehousesService.list(req.auth);
      res.status(200).json({ warehouses });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/warehouses/:id`
   * @type {import("express").RequestHandler}
   */
  getById = async (req, res, next) => {
    try {
      const warehouse = await this.warehousesService.getById(req.auth, req.params.id);
      res.status(200).json(warehouse);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/warehouses/:id`
   * @type {import("express").RequestHandler}
   */
  update = async (req, res, next) => {
    try {
      const warehouse = await this.warehousesService.update(req.auth, req.params.id, req.body);
      res.status(200).json(warehouse);
    } catch (err) {
      next(err);
    }
  };
}
