<script setup>
import { onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.store.js";
import { useCartStore } from "../stores/cart.store.js";
import { connectSocket, disconnectSocket } from "../lib/socket.js";
import Button from "@/components/ui/button/Button.vue";

const router = useRouter();
const authStore = useAuthStore();
const cartStore = useCartStore();

function connect() {
  if (!authStore.accessToken) return;
  connectSocket(authStore.accessToken);
}

watch(
  () => authStore.accessToken,
  (token) => (token ? connect() : disconnectSocket()),
);
onMounted(connect);
onUnmounted(disconnectSocket);

/** @returns {Promise<void>} */
async function onLogout() {
  disconnectSocket();
  await authStore.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header
      class="flex items-center justify-between border-b border-brand-brown/10 bg-white px-4 py-3"
    >
      <img src="/murcha-logo.svg" alt="Murcha" class="h-7 w-auto" />
      <div class="flex items-center gap-2">
        <span v-if="authStore.company" class="text-xs text-brand-brown/60">
          {{ authStore.company.name }}
        </span>
        <Button variant="ghost" size="sm" @click="onLogout">Chiqish</Button>
      </div>
    </header>
    <main class="flex-1 p-4 pb-20">
      <router-view />
    </main>
    <nav
      class="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-brand-brown/10 bg-white py-2"
    >
      <router-link
        :to="{ name: 'home' }"
        class="flex-1 py-2 text-center text-sm text-brand-brown/70 hover:text-brand-brown"
        active-class="font-semibold text-brand-amber"
      >
        Katalog
      </router-link>
      <router-link
        :to="{ name: 'cart' }"
        class="flex-1 py-2 text-center text-sm text-brand-brown/70 hover:text-brand-brown"
        active-class="font-semibold text-brand-amber"
      >
        Savat{{ cartStore.itemCount > 0 ? ` (${cartStore.itemCount})` : "" }}
      </router-link>
      <router-link
        :to="{ name: 'orders' }"
        class="flex-1 py-2 text-center text-sm text-brand-brown/70 hover:text-brand-brown"
        active-class="font-semibold text-brand-amber"
      >
        Zakazlarim
      </router-link>
    </nav>
  </div>
</template>
