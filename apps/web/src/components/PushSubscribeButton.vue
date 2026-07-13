<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import * as pushApi from "../api/push-subscriptions.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";

const { t } = useI18n();

const isSupported = "serviceWorker" in navigator && "PushManager" in window;
const isSubscribed = ref(false);
const isBusy = ref(false);
const error = ref("");

onMounted(async () => {
  if (!isSupported) return;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const existing = await registration?.pushManager.getSubscription();
  isSubscribed.value = Boolean(existing);
});

/**
 * @param {string} base64String
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** @returns {Promise<void>} */
async function onSubscribe() {
  error.value = "";
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    error.value = t("pushSubscribe.notConfigured");
    return;
  }
  isBusy.value = true;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      error.value = t("pushSubscribe.permissionDenied");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    await pushApi.subscribePush(subscription);
    isSubscribed.value = true;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t("pushSubscribe.subscribeError");
  } finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <div v-if="isSupported" class="flex items-center gap-1">
    <Button v-if="!isSubscribed" variant="ghost" size="sm" :disabled="isBusy" @click="onSubscribe">
      {{ isBusy ? "…" : `🔔 ${t("pushSubscribe.label")}` }}
    </Button>
    <span v-else class="text-xs text-brand-brown/50" :title="t('pushSubscribe.subscribedTitle')">
      🔔
    </span>
    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>
