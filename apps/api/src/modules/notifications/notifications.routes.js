import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { NotificationsRepository } from "./notifications.repository.js";
import { CompanyMembersRepository } from "../companies/company-members.repository.js";
import { RolesRepository } from "../roles/roles.repository.js";
import { PushSubscriptionsRepository } from "../push-subscriptions/push-subscriptions.repository.js";
import { UserAssignmentsRepository } from "../user-assignments/user-assignments.repository.js";
import { NotificationsService } from "./notifications.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { domainEvents } from "../../lib/events.js";
import { logger } from "../../lib/logger.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const notificationsService = new NotificationsService({
  notificationsRepository: new NotificationsRepository(),
  companyMembersRepository: new CompanyMembersRepository(),
  rolesRepository: new RolesRepository(),
  pushSubscriptionsRepository: new PushSubscriptionsRepository(),
  userAssignmentsRepository: new UserAssignmentsRepository(),
});
const notificationsController = new NotificationsController({ notificationsService });

// `order.new` domen hodisasi obunasi — `orders` moduli bu servisni bilmaydi
// (CLAUDE.md: EventEmitter orqali loose coupling). Best-effort: xato bo'lsa
// faqat log, zakaz yaratish oqimi bunga bog'liq emas (u allaqachon tugagan).
domainEvents.on("order.new", (event) => {
  notificationsService
    .notifyOrderNew(event)
    .catch((err) => logger.error({ err, event }, "order.new bildirishnomasini yaratishda xato"));
});

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", notificationsController.list);
notificationsRouter.patch("/:id/read", notificationsController.markRead);
