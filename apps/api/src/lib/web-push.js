import webpush from "web-push";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

if (env.vapidPublicKey && env.vapidPrivateKey) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
}

/**
 * Brauzerga Web Push xabari yuboradi. `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`
 * sozlanmagan bo'lsa (dev-muhit) — jim o'tkazib yuboradi, `lib/sms.js` bilan
 * bir xil "ixtiyoriy tashqi xizmat" konvensiyasi. Xatolikda ham otilmaydi —
 * best-effort, asosiy bildirishnoma oqimi push yetkazilishiga bog'liq emas.
 * @param {{ endpoint: string, keys: { p256dh: string, auth: string } }} subscription
 * @param {object} payload
 * @returns {Promise<{ expired: boolean }>} `expired: true` bo'lsa (410/404)
 *   obuna endi yaroqsiz — chaqiruvchi uni DB'dan o'chirishi kerak.
 */
export async function sendWebPush(subscription, payload) {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    logger.warn(
      { endpoint: subscription.endpoint },
      "Web Push yuborilmadi — VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY sozlanmagan",
    );
    return { expired: false };
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { expired: false };
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { expired: true };
    }
    logger.error({ err, endpoint: subscription.endpoint }, "Web Push yuborishda xato");
    return { expired: false };
  }
}
