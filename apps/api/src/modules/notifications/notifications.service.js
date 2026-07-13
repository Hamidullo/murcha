import { uuidv7 } from "uuidv7";
import { withTenant, withoutTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";
import { emitToCompany } from "../../lib/socket.js";
import { sendWebPush } from "../../lib/web-push.js";

const ORDER_NOTIFY_PERMISSION = "orders.confirm";
const DEBT_NOTIFY_PERMISSION = "debts.manage";
const LEAD_NOTIFY_PERMISSION = "companies.manage";

/**
 * BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). `notifyOrderNew()` — `order.new`
 * domen hodisasi tinglovchisi (`notifications.routes.js` kompozitsiya
 * vaqtida `domainEvents.on()` orqali ulaydi, `orders` moduli bu servisni
 * bilmaydi — loose coupling). Qabul qiluvchilar: `orders.confirm` ruxsatiga
 * ega faol kompaniya a'zolari (MVP — sklad tomoni, "faqat shu skladga
 * biriktirilganlar" nozikroq filtri BACKLOG'ga).
 */
export class NotificationsService {
  /**
   * @param {{
   *   notificationsRepository: import("./notifications.repository.js").NotificationsRepository,
   *   companyMembersRepository: import("../companies/company-members.repository.js").CompanyMembersRepository,
   *   rolesRepository: import("../roles/roles.repository.js").RolesRepository,
   *   pushSubscriptionsRepository: import("../push-subscriptions/push-subscriptions.repository.js").PushSubscriptionsRepository,
   *   userAssignmentsRepository: import("../user-assignments/user-assignments.repository.js").UserAssignmentsRepository,
   * }} deps
   */
  constructor({
    notificationsRepository,
    companyMembersRepository,
    rolesRepository,
    pushSubscriptionsRepository,
    userAssignmentsRepository,
  }) {
    this.notificationsRepository = notificationsRepository;
    this.companyMembersRepository = companyMembersRepository;
    this.rolesRepository = rolesRepository;
    this.pushSubscriptionsRepository = pushSubscriptionsRepository;
    this.userAssignmentsRepository = userAssignmentsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {{ unreadOnly?: boolean }} [filters]
   * @returns {Promise<import("@prisma/client").Notification[]>}
   */
  async list(auth, filters) {
    return withTenant(auth.companyId, auth.userId, (tx) =>
      this.notificationsRepository.listByUser(tx, auth.userId, filters),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Notification>}
   */
  async markRead(auth, id) {
    return withTenant(auth.companyId, auth.userId, async (tx) => {
      const notification = await this.notificationsRepository.findById(tx, id);
      if (!notification || notification.userId !== auth.userId) {
        throw new NotFoundError("Bildirishnoma topilmadi");
      }
      return this.notificationsRepository.markRead(tx, id);
    });
  }

  /**
   * `order.new` hodisasi tinglovchisi. Foydalanuvchi konteksti yo'q (tizim
   * hodisasi) — `withTenant(companyId, null, ...)`: `notifications`
   * jadvalida faqat `company_id` bo'yicha RLS bor, `app.user_id` shart emas.
   * @param {{ companyId: string, orderId: string, orderNumber: string, salePointId: string }} event
   * @returns {Promise<import("@prisma/client").Notification[]>}
   */
  async notifyOrderNew(event) {
    const created = await withTenant(event.companyId, null, async (tx) => {
      const members = await this.companyMembersRepository.list(tx, event.companyId);
      const result = [];
      for (const member of members) {
        if (member.status !== "active") continue;
        const allowed = await this.rolesRepository.hasPermission(
          tx,
          member.roleId,
          ORDER_NOTIFY_PERMISSION,
        );
        if (!allowed) continue;
        const notification = await this.notificationsRepository.create(tx, {
          id: uuidv7(),
          companyId: event.companyId,
          userId: member.userId,
          type: "order.new",
          title: "Yangi zakaz",
          body: `№ ${event.orderNumber}`,
          data: { orderId: event.orderId, salePointId: event.salePointId },
          channel: "inapp",
        });
        result.push(notification);
      }
      return result;
    });

    // Tranzaksiyadan tashqarida — Socket.IO/Web Push tarmoq I/O (best-effort,
    // ikkalasi ham o'zi xatoni ushlaydi, asosiy oqim to'xtamaydi).
    for (const notification of created) {
      emitToCompany(event.companyId, "notification", notification);
      await this.#sendPushToUser(notification.userId, {
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
    }

    return created;
  }

  /**
   * Kunlik qarz eslatma job'i chaqiradi (`worker.js`, `debt-reminders`
   * navbati — `domainEvents`ga bog'lanmaydi, worker alohida process).
   * Qabul qiluvchilar: `debts.manage` egalari + qarzdor sotuv nuqtasiga
   * biriktirilgan operator(lar) (`shop_operator`da hozircha hech qanday
   * ruxsat yo'q, shuning uchun to'g'ridan-to'g'ri userId bo'yicha). Bir kunda
   * bitta `(orderId, bucket)` uchun bir marta (`existsDebtReminderToday`).
   * @param {{ companyId: string, counterpartyId: string, orderId: string, orderNumber: string, salePointId: string | null, amount: number, currency: string, bucket: "due_soon" | "overdue" }} event
   * @returns {Promise<import("@prisma/client").Notification[]>}
   */
  async notifyDebtReminder(event) {
    const dateKey = new Date().toISOString().slice(0, 10);

    const created = await withTenant(event.companyId, null, async (tx) => {
      const already = await this.notificationsRepository.existsDebtReminderToday(
        tx,
        event.companyId,
        event.orderId,
        event.bucket,
        dateKey,
      );
      if (already) return [];

      const title =
        event.bucket === "overdue" ? "Qarz muddati o'tdi" : "Qarz to'lov muddati yaqinlashmoqda";
      const body = `№ ${event.orderNumber} — ${event.amount} ${event.currency}`;
      const data = { orderId: event.orderId, kind: "debt_reminder", bucket: event.bucket, dateKey };

      const recipientUserIds = new Set();
      const members = await this.companyMembersRepository.list(tx, event.companyId);
      for (const member of members) {
        if (member.status !== "active") continue;
        const allowed = await this.rolesRepository.hasPermission(
          tx,
          member.roleId,
          DEBT_NOTIFY_PERMISSION,
        );
        if (allowed) recipientUserIds.add(member.userId);
      }
      if (event.salePointId) {
        const assignments = await this.userAssignmentsRepository.listByTarget(
          tx,
          "sale_point",
          event.salePointId,
        );
        for (const assignment of assignments)
          recipientUserIds.add(assignment.companyMember.user.id);
      }

      const result = [];
      for (const userId of recipientUserIds) {
        const notification = await this.notificationsRepository.create(tx, {
          id: uuidv7(),
          companyId: event.companyId,
          userId,
          type: "debt.reminder",
          title,
          body,
          data,
          channel: "inapp",
        });
        result.push(notification);
      }
      return result;
    });

    for (const notification of created) {
      emitToCompany(event.companyId, "notification", notification);
      await this.#sendPushToUser(notification.userId, {
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
    }
    return created;
  }

  /**
   * `lead.new` hodisasi tinglovchisi (`showcase.service.js createLead()`,
   * `notifyOrderNew()`dagi bilan bir xil naqsh). Qabul qiluvchilar —
   * `companies.manage` egalari (kompaniya darajasidagi qaror qabul
   * qiluvchilar, vitrina sozlamalarini ham shular boshqaradi).
   * @param {{ companyId: string, leadId: string, name: string, phone: string }} event
   * @returns {Promise<import("@prisma/client").Notification[]>}
   */
  async notifyLeadNew(event) {
    const created = await withTenant(event.companyId, null, async (tx) => {
      const members = await this.companyMembersRepository.list(tx, event.companyId);
      const result = [];
      for (const member of members) {
        if (member.status !== "active") continue;
        const allowed = await this.rolesRepository.hasPermission(
          tx,
          member.roleId,
          LEAD_NOTIFY_PERMISSION,
        );
        if (!allowed) continue;
        const notification = await this.notificationsRepository.create(tx, {
          id: uuidv7(),
          companyId: event.companyId,
          userId: member.userId,
          type: "lead.new",
          title: "Yangi lid — vitrinadan",
          body: `${event.name} — ${event.phone}`,
          data: { leadId: event.leadId },
          channel: "inapp",
        });
        result.push(notification);
      }
      return result;
    });

    for (const notification of created) {
      emitToCompany(event.companyId, "notification", notification);
      await this.#sendPushToUser(notification.userId, {
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
    }
    return created;
  }

  /**
   * @param {string} userId
   * @param {object} payload
   * @returns {Promise<void>}
   */
  async #sendPushToUser(userId, payload) {
    const subscriptions = await withoutTenant((tx) =>
      this.pushSubscriptionsRepository.listByUser(tx, userId),
    );
    for (const subscription of subscriptions) {
      const { expired } = await sendWebPush(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
      );
      if (expired) {
        await withoutTenant((tx) => this.pushSubscriptionsRepository.remove(tx, subscription.id));
      }
    }
  }
}
