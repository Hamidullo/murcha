/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class ProductPricesController {
  /**
   * @param {{ productPricesService: import("./product-prices.service.js").ProductPricesService }} deps
   */
  constructor({ productPricesService }) {
    this.productPricesService = productPricesService;
  }

  /**
   * `POST /api/v1/products/:id/prices`
   * @type {import("express").RequestHandler}
   */
  create = async (req, res, next) => {
    try {
      const price = await this.productPricesService.addPrice(req.auth, req.params.id, req.body);
      res.status(201).json(price);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products/:id/prices`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const prices = await this.productPricesService.listPrices(req.auth, req.params.id);
      res.status(200).json({ prices });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/products/:id/prices/current`
   * @type {import("express").RequestHandler}
   */
  current = async (req, res, next) => {
    try {
      const prices = await this.productPricesService.currentPrices(req.auth, req.params.id);
      res.status(200).json({ prices });
    } catch (err) {
      next(err);
    }
  };
}
