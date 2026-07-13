<script setup>
import { reactive, ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Menu, X } from "lucide-vue-next";
import { useAuthStore } from "../stores/auth.store.js";
import { connectSocket, disconnectSocket, playDing } from "../lib/socket.js";
import { queuedCount, flushOutbox } from "../lib/offline-outbox.js";
import * as warehouseDocsApi from "../api/warehouse-docs.api.js";
import Button from "@/components/ui/button/Button.vue";
import PushSubscribeButton from "@/components/PushSubscribeButton.vue";

const router = useRouter();
const authStore = useAuthStore();
const { t, locale } = useI18n();

/** Desktop'da gorizontal-skroll nav, mobil'da (sm dan kichik) ochiladigan panel — ikkalasi ham shu ro'yxatdan render bo'ladi (takrorlanmasin). */
const NAV_ITEMS = [
  { name: "dashboard", labelKey: "nav.dashboard" },
  { name: "products", labelKey: "nav.products" },
  { name: "warehouses", labelKey: "nav.warehouses" },
  { name: "warehouse-docs", labelKey: "nav.warehouseDocs" },
  { name: "barcode-scan", labelKey: "nav.barcodeScan" },
  { name: "inventory-counts", labelKey: "nav.inventoryCounts" },
  { name: "sale-points", labelKey: "nav.salePoints" },
  { name: "orders", labelKey: "nav.orders" },
  { name: "employees", labelKey: "nav.employees" },
  { name: "deliveries", labelKey: "nav.deliveries" },
  { name: "delivery-map", labelKey: "nav.deliveryMap" },
  { name: "courier-deliveries", labelKey: "nav.courierDeliveries" },
  { name: "debts-aging", labelKey: "nav.debtsAging" },
  { name: "cash-registers", labelKey: "nav.cashRegisters" },
  { name: "reports-sales", labelKey: "nav.reportsSales" },
  { name: "audit-logs", labelKey: "nav.auditLogs" },
  { name: "company-settings", labelKey: "nav.companySettings" },
];

const isMobileNavOpen = ref(false);

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
    <header class="border-b border-brand-brown/10 bg-white">
      <div class="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div class="flex min-w-0 flex-1 items-center gap-6">
          <img src="/murcha-logo.svg" alt="Murcha" class="h-8 w-auto shrink-0" />
          <nav
            class="hidden min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap text-sm text-brand-brown/70 sm:flex"
          >
            <router-link
              v-for="item in NAV_ITEMS"
              :key="item.name"
              :to="{ name: item.name }"
              class="hover:text-brand-brown"
            >
              {{ t(item.labelKey) }}
            </router-link>
          </nav>
        </div>
        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <PushSubscribeButton class="hidden sm:flex" />
          <span
            v-if="authStore.company"
            class="hidden max-w-32 truncate text-sm text-brand-brown/60 sm:inline"
          >
            {{ authStore.company.name }}
          </span>
          <span
            v-if="queuedCount > 0"
            class="whitespace-nowrap rounded-full bg-brand-amber/20 px-2 py-0.5 text-xs text-brand-amber"
          >
            {{ t("common.queuedActions", { count: queuedCount }) }}
          </span>
          <button
            class="hidden shrink-0 text-sm text-brand-brown/70 hover:text-brand-brown sm:inline"
            @click="toggleLocale"
          >
            {{ locale === "uz" ? "RU" : "UZ" }}
          </button>
          <Button
            variant="ghost"
            size="sm"
            class="hidden shrink-0 sm:inline-flex"
            @click="onLogout"
          >
            {{ t("common.logout") }}
          </Button>
          <button
            class="shrink-0 rounded-md p-1.5 text-brand-brown hover:bg-brand-brown/5 sm:hidden"
            :aria-label="t('common.menu')"
            @click="isMobileNavOpen = !isMobileNavOpen"
          >
            <X v-if="isMobileNavOpen" class="h-5 w-5" />
            <Menu v-else class="h-5 w-5" />
          </button>
        </div>
      </div>

      <div v-if="isMobileNavOpen" class="border-t border-brand-brown/10 px-4 py-3 sm:hidden">
        <nav class="flex flex-col gap-3 text-sm text-brand-brown/70">
          <router-link
            v-for="item in NAV_ITEMS"
            :key="item.name"
            :to="{ name: item.name }"
            class="hover:text-brand-brown"
            @click="isMobileNavOpen = false"
          >
            {{ t(item.labelKey) }}
          </router-link>
        </nav>
        <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-brand-brown/10 pt-3">
          <PushSubscribeButton />
          <span v-if="authStore.company" class="text-sm text-brand-brown/60">
            {{ authStore.company.name }}
          </span>
          <button class="text-sm text-brand-brown/70 hover:text-brand-brown" @click="toggleLocale">
            {{ locale === "uz" ? "RU" : "UZ" }}
          </button>
          <Button variant="ghost" size="sm" @click="onLogout">{{ t("common.logout") }}</Button>
        </div>
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
