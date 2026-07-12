import { apiFetch } from "./client.js";

/**
 * @param {PushSubscription} subscription — brauzer `PushManager.subscribe()` natijasi
 * @returns {Promise<object>}
 */
export function subscribePush(subscription) {
  const json = subscription.toJSON();
  return apiFetch("/push-subscriptions", {
    method: "POST",
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
}
