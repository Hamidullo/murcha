/** HTTP qatlam: request → service → response (CLAUDE.md qatlam qoidasi). */
export class PushSubscriptionsController {
  /**
   * @param {{ pushSubscriptionsService: import("./push-subscriptions.service.js").PushSubscriptionsService }} deps
   */
  constructor({ pushSubscriptionsService }) {
    this.pushSubscriptionsService = pushSubscriptionsService;
  }

  /**
   * `POST /api/v1/push-subscriptions`
   * @type {import("express").RequestHandler}
   */
  subscribe = async (req, res, next) => {
    try {
      const subscription = await this.pushSubscriptionsService.subscribe(req.auth, req.body);
      res.status(201).json(subscription);
    } catch (err) {
      next(err);
    }
  };

  /**
   * `DELETE /api/v1/push-subscriptions/:id`
   * @type {import("express").RequestHandler}
   */
  unsubscribe = async (req, res, next) => {
    try {
      await this.pushSubscriptionsService.unsubscribe(req.auth, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
