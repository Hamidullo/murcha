/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class UnitsController {
  /**
   * @param {{ unitsService: import("./units.service.js").UnitsService }} deps
   */
  constructor({ unitsService }) {
    this.unitsService = unitsService;
  }

  /**
   * `GET /api/v1/units`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const units = await this.unitsService.list(req.auth);
      res.status(200).json({ units });
    } catch (err) {
      next(err);
    }
  };
}
