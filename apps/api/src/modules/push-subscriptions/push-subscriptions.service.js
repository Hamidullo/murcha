import { uuidv7 } from "uuidv7";
import { withoutTenant } from "../../lib/tenant-context.js";
import { NotFoundError } from "../../lib/errors.js";

/** BIZNES LOGIKA (CLAUDE.md qatlam qoidasi). `push_subscriptions` — `company_id`siz global jadval (foydalanuvchiga bog'liq), shu sababli `withoutTenant()`. */
export class PushSubscriptionsService {
  /**
   * @param {{ pushSubscriptionsRepository: import("./push-subscriptions.repository.js").PushSubscriptionsRepository }} deps
   */
  constructor({ pushSubscriptionsRepository }) {
    this.pushSubscriptionsRepository = pushSubscriptionsRepository;
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {import("@murcha/shared").createPushSubscriptionSchema._type} dto
   * @returns {Promise<import("@prisma/client").PushSubscription>}
   */
  async subscribe(auth, dto) {
    return withoutTenant((tx) =>
      this.pushSubscriptionsRepository.upsert(tx, {
        id: uuidv7(),
        userId: auth.userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      }),
    );
  }

  /**
   * @param {{ userId: string, companyId: string, roleId: string }} auth
   * @param {string} id
   * @returns {Promise<void>}
   */
  async unsubscribe(auth, id) {
    return withoutTenant(async (tx) => {
      const subscription = await this.pushSubscriptionsRepository.findById(tx, id);
      if (!subscription || subscription.userId !== auth.userId) {
        throw new NotFoundError("Push obuna topilmadi");
      }
      await this.pushSubscriptionsRepository.remove(tx, id);
    });
  }
}
