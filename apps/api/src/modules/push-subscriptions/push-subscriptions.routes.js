import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { createPushSubscriptionSchema } from "./push-subscriptions.schemas.js";
import { PushSubscriptionsRepository } from "./push-subscriptions.repository.js";
import { PushSubscriptionsService } from "./push-subscriptions.service.js";
import { PushSubscriptionsController } from "./push-subscriptions.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const pushSubscriptionsService = new PushSubscriptionsService({
  pushSubscriptionsRepository: new PushSubscriptionsRepository(),
});
const pushSubscriptionsController = new PushSubscriptionsController({ pushSubscriptionsService });

export const pushSubscriptionsRouter = Router();
pushSubscriptionsRouter.use(requireAuth);

pushSubscriptionsRouter.post(
  "/",
  validate(createPushSubscriptionSchema),
  pushSubscriptionsController.subscribe,
);
pushSubscriptionsRouter.delete("/:id", pushSubscriptionsController.unsubscribe);
