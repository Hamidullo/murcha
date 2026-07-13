import { renderShowcaseHtml } from "./showcase.html.js";
import { env } from "../../config/env.js";

/** HTTP qatlam (CLAUDE.md qatlam qoidasi). Autentifikatsiyasiz. */
export class ShowcaseController {
  /**
   * @param {{ showcaseService: import("./showcase.service.js").ShowcaseService }} deps
   */
  constructor({ showcaseService }) {
    this.showcaseService = showcaseService;
  }

  /**
   * `GET /api/v1/showcase/:slug` — to'liq HTML (Googlebot uchun server-render).
   * @type {import("express").RequestHandler}
   */
  show = async (req, res, next) => {
    try {
      const data = await this.showcaseService.getShowcase(req.params.slug);
      const html = renderShowcaseHtml(data, env.publicBaseUrl ?? "");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(html);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `POST /api/v1/showcase/:slug/leads`
   * @type {import("express").RequestHandler}
   */
  createLead = async (req, res, next) => {
    try {
      const lead = await this.showcaseService.createLead(req.params.slug, req.body);
      res.status(201).json({ id: lead.id, status: lead.status });
    } catch (err) {
      next(err);
    }
  };
}
