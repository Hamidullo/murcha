import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { createDeliverySchema } from "./deliveries.schemas.js";
import { DeliveriesRepository } from "./deliveries.repository.js";
import { OrdersRepository } from "../orders/orders.repository.js";
import { CompanyMembersRepository } from "../companies/company-members.repository.js";
import { RolesRepository } from "../roles/roles.repository.js";
import { DeliveriesService } from "./deliveries.service.js";
import { DeliveriesController } from "./deliveries.controller.js";

// Kompozitsiya ildizi (qo'lda DI factory — CLAUDE.md).
const deliveriesService = new DeliveriesService({
  deliveriesRepository: new DeliveriesRepository(),
  ordersRepository: new OrdersRepository(),
  companyMembersRepository: new CompanyMembersRepository(),
  rolesRepository: new RolesRepository(),
});
const deliveriesController = new DeliveriesController({ deliveriesService });

export const deliveriesRouter = Router();
deliveriesRouter.use(requireAuth);

deliveriesRouter.post(
  "/",
  requirePermission("deliveries.manage"),
  validate(createDeliverySchema),
  deliveriesController.create,
);
deliveriesRouter.get("/", deliveriesController.list);
deliveriesRouter.get("/:id", deliveriesController.getById);
deliveriesRouter.post("/:id/orders/:orderId/deliver", deliveriesController.deliverStop);
