<script setup>
import { reactive, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth.store.js";
import { connectSocket, disconnectSocket, playDing } from "../lib/socket.js";
import { queuedCount, flushOutbox } from "../lib/offline-outbox.js";
import * as warehouseDocsApi from "../api/warehouse-docs.api.js";
import Button from "@/components/ui/button/Button.vue";
import PushSubscribeButton from "@/components/PushSubscribeButton.vue";

const router = useRouter();
const authStore = useAuthStore();
const { t, locale } = useI18n();

function toggleLocale() {
  locale.value = locale.value === "uz" ? "ru" : "uz";
}

/** @type {import("vue").Reactive<Array<{ id: number, title: string, body: string }>>} */
const toasts = reactive([]);
let toastSeq = 0;
/** @type {import("socket.io-client").Socket | null} */
let socket = null;

function connect() {
  if (socket || !authStore.accessToken) return;
  socket = connectSocket(authStore.accessToken);
  socket.on("notification", (notification) => {
    const id = ++toastSeq;
    toasts.push({ id, title: notification.title, body: notification.body ?? "" });
    playDing();
    setTimeout(() => {
      const i = toasts.findIndex((t) => t.id === id);
      if (i !== -1) toasts.splice(i, 1);
    }, 6000);
  });
}

function disconnect() {
  disconnectSocket();
  socket = null;
}

watch(
  () => authStore.accessToken,
  (token) => (token ? connect() : disconnect()),
);
onMounted(connect);
onUnmounted(disconnect);

/** @returns {Promise<void>} */
function flushQueuedActions() {
  return flushOutbox({
    confirm: (docId) => warehouseDocsApi.confirmWarehouseDoc(docId),
    cancel: (docId) => warehouseDocsApi.cancelWarehouseDoc(docId),
  });
}

let flushInterval;
onMounted(() => {
  flushQueuedActions();
  window.addEventListener("online", flushQueuedActions);
  flushInterval = setInterval(flushQueuedActions, 60000);
});
onUnmounted(() => {
  window.removeEventListener("online", flushQueuedActions);
  clearInterval(flushInterval);
});

/** @returns {Promise<void>} */
async function onLogout() {
  disconnect();
  await authStore.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="min-h-screen">
    <header
      class="flex items-center justify-between gap-4 border-b border-brand-brown/10 bg-white px-6 py-3"
    >
      <div class="flex min-w-0 flex-1 items-center gap-6">
        <img src="/murcha-logo.svg" alt="Murcha" class="h-8 w-auto shrink-0" />
        <nav
          class="flex min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap text-sm text-brand-brown/70"
        >
          <router-link :to="{ name: 'dashboard' }" class="hover:text-brand-brown">
            {{ t("nav.dashboard") }}
          </router-link>
          <router-link :to="{ name: 'products' }" class="hover:text-brand-brown">
            {{ t("nav.products") }}
          </router-link>
          <router-link :to="{ name: 'warehouses' }" class="hover:text-brand-brown">
            {{ t("nav.warehouses") }}
          </router-link>
          <router-link :to="{ name: 'warehouse-docs' }" class="hover:text-brand-brown">
            {{ t("nav.warehouseDocs") }}
          </router-link>
          <router-link :to="{ name: 'barcode-scan' }" class="hover:text-brand-brown">
            {{ t("nav.barcodeScan") }}
          </router-link>
          <router-link :to="{ name: 'inventory-counts' }" class="hover:text-brand-brown">
            {{ t("nav.inventoryCounts") }}
          </router-link>
          <router-link :to="{ name: 'sale-points' }" class="hover:text-brand-brown">
            {{ t("nav.salePoints") }}
          </router-link>
          <router-link :to="{ name: 'orders' }" class="hover:text-brand-brown">
            {{ t("nav.orders") }}
          </router-link>
          <router-link :to="{ name: 'employees' }" class="hover:text-brand-brown">
            {{ t("nav.employees") }}
          </router-link>
          <router-link :to="{ name: 'deliveries' }" class="hover:text-brand-brown">
            {{ t("nav.deliveries") }}
          </router-link>
          <router-link :to="{ name: 'delivery-map' }" class="hover:text-brand-brown">
            {{ t("nav.deliveryMap") }}
          </router-link>
          <router-link :to="{ name: 'courier-deliveries' }" class="hover:text-brand-brown">
            {{ t("nav.courierDeliveries") }}
          </router-link>
          <router-link :to="{ name: 'debts-aging' }" class="hover:text-brand-brown">
            {{ t("nav.debtsAging") }}
          </router-link>
          <router-link :to="{ name: 'cash-registers' }" class="hover:text-brand-brown">
            {{ t("nav.cashRegisters") }}
          </router-link>
          <router-link :to="{ name: 'reports-sales' }" class="hover:text-brand-brown">
            {{ t("nav.reportsSales") }}
          </router-link>
          <router-link :to="{ name: 'audit-logs' }" class="hover:text-brand-brown">
            {{ t("nav.auditLogs") }}
          </router-link>
          <router-link :to="{ name: 'company-settings' }" class="hover:text-brand-brown">
            {{ t("nav.companySettings") }}
          </router-link>
        </nav>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <PushSubscribeButton />
        <span v-if="authStore.company" class="max-w-32 truncate text-sm text-brand-brown/60">
          {{ authStore.company.name }}
        </span>
        <span
          v-if="queuedCount > 0"
          class="whitespace-nowrap rounded-full bg-brand-amber/20 px-2 py-0.5 text-xs text-brand-amber"
        >
          {{ t("common.queuedActions", { count: queuedCount }) }}
        </span>
        <button
          class="shrink-0 text-sm text-brand-brown/70 hover:text-brand-brown"
          @click="toggleLocale"
        >
          {{ locale === "uz" ? "RU" : "UZ" }}
        </button>
        <Button variant="ghost" size="sm" class="shrink-0" @click="onLogout">
          {{ t("common.logout") }}
        </Button>
      </div>
    </header>
    <main class="p-6">
      <router-view />
    </main>

    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="w-72 rounded-lg border border-brand-brown/10 bg-white p-3 shadow-lg"
      >
        <p class="text-sm font-medium text-brand-brown">{{ toast.title }}</p>
        <p v-if="toast.body" class="text-xs text-brand-brown/60">{{ toast.body }}</p>
      </div>
    </div>
  </div>
</template>
