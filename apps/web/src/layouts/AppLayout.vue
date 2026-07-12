<script setup>
import { reactive, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.store.js";
import { connectSocket, disconnectSocket, playDing } from "../lib/socket.js";
import Button from "@/components/ui/button/Button.vue";
import PushSubscribeButton from "@/components/PushSubscribeButton.vue";

const router = useRouter();
const authStore = useAuthStore();

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
async function onLogout() {
  disconnect();
  await authStore.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="min-h-screen">
    <header
      class="flex items-center justify-between border-b border-brand-brown/10 bg-white px-6 py-3"
    >
      <div class="flex items-center gap-6">
        <img src="/murcha-logo.svg" alt="Murcha" class="h-8 w-auto" />
        <nav class="flex items-center gap-4 text-sm text-brand-brown/70">
          <router-link :to="{ name: 'products' }" class="hover:text-brand-brown">
            Katalog
          </router-link>
          <router-link :to="{ name: 'warehouse-docs' }" class="hover:text-brand-brown">
            Sklad hujjatlari
          </router-link>
          <router-link :to="{ name: 'barcode-scan' }" class="hover:text-brand-brown">
            Shtrix-kod
          </router-link>
          <router-link :to="{ name: 'inventory-counts' }" class="hover:text-brand-brown">
            Inventarizatsiya
          </router-link>
          <router-link :to="{ name: 'sale-points' }" class="hover:text-brand-brown">
            Sotuv nuqtalari
          </router-link>
          <router-link :to="{ name: 'orders' }" class="hover:text-brand-brown">
            Zakazlar
          </router-link>
          <router-link :to="{ name: 'employees' }" class="hover:text-brand-brown">
            Hodimlar
          </router-link>
          <router-link :to="{ name: 'deliveries' }" class="hover:text-brand-brown">
            Dostavkalar
          </router-link>
          <router-link :to="{ name: 'delivery-map' }" class="hover:text-brand-brown">
            Xarita
          </router-link>
          <router-link :to="{ name: 'courier-deliveries' }" class="hover:text-brand-brown">
            Yetkazish
          </router-link>
        </nav>
      </div>
      <div class="flex items-center gap-3">
        <PushSubscribeButton />
        <span v-if="authStore.company" class="text-sm text-brand-brown/60">
          {{ authStore.company.name }}
        </span>
        <Button variant="ghost" size="sm" @click="onLogout">Chiqish</Button>
      </div>
    </header>
    <main class="p-6">
      <router-view />
    </main>

    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="w-72 rounded-lg border border-brand-brown/10 bg-white p-3 shadow-lg"
      >
        <p class="text-sm font-medium text-brand-brown">{{ t.title }}</p>
        <p v-if="t.body" class="text-xs text-brand-brown/60">{{ t.body }}</p>
      </div>
    </div>
  </div>
</template>
