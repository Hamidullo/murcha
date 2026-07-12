const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class ExportsController {
  /**
   * @param {{ exportsService: import("./exports.service.js").ExportsService }} deps
   */
  constructor({ exportsService }) {
    this.exportsService = exportsService;
  }

  /**
   * `GET /api/v1/exports/products`
   * @type {import("express").RequestHandler}
   */
  exportProducts = async (req, res, next) => {
    try {
      const buffer = await this.exportsService.exportProducts(req.auth);
      this.#sendXlsx(res, buffer, "mahsulotlar.xlsx");
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/exports/stock`
   * @type {import("express").RequestHandler}
   */
  exportStock = async (req, res, next) => {
    try {
      const buffer = await this.exportsService.exportStock(req.auth);
      this.#sendXlsx(res, buffer, "qoldiq.xlsx");
    } catch (err) {
      next(err);
    }
  };

  /**
   * `GET /api/v1/exports/counterparties`
   * @type {import("express").RequestHandler}
   */
  exportCounterparties = async (req, res, next) => {
    try {
      const buffer = await this.exportsService.exportCounterparties(req.auth);
      this.#sendXlsx(res, buffer, "kontragentlar.xlsx");
    } catch (err) {
      next(err);
    }
  };

  /**
   * @param {import("express").Response} res
   * @param {import("exceljs").Buffer} buffer
   * @param {string} filename
   * @returns {void}
   */
  #sendXlsx(res, buffer, filename) {
    res.setHeader("Content-Type", XLSX_CONTENT_TYPE);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  }
}
