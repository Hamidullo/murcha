import { listNotificationsQuerySchema } from "./notifications.schemas.js";
import { ValidationError } from "../../lib/errors.js";

/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class NotificationsController {
  /**
   * @param {{ notificationsService: import("./notifications.service.js").NotificationsService }} deps
   */
  constructor({ notificationsService }) {
    this.notificationsService = notificationsService;
  }

  /**
   * `GET /api/v1/notifications`
   * @type {import("express").RequestHandler}
   */
  list = async (req, res, next) => {
    try {
      const parsed = listNotificationsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Noto'g'ri so'rov", parsed.error.issues);
      }
      const notifications = await this.notificationsService.list(req.auth, parsed.data);
      res.status(200).json({ notifications });
    } catch (err) {
      next(err);
    }
  };

  /**
   * `PATCH /api/v1/notifications/:id/read`
   * @type {import("express").RequestHandler}
   */
  markRead = async (req, res, next) => {
    try {
      const notification = await this.notificationsService.markRead(req.auth, req.params.id);
      res.status(200).json(notification);
    } catch (err) {
      next(err);
    }
  };
}
