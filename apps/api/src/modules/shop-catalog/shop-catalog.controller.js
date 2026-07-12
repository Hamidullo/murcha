import { listShopCatalogQuerySchema } from "@murcha/shared";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class ShopCatalogController {
  /**
   * @param {{ shopCatalogService: import("./shop-catalog.service.js").ShopCatalogService }} deps
   */
  constructor({ shopCatalogService }) {
    this.shopCatalogService = shopCatalogService;
  }

  /**
   * `GET /api/v1/shop-catalog`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listShopCatalogQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const items = await this.shopCatalogService.list(req.auth, parsed.data);
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  };
}
