<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.store.js";
import Button from "@/components/ui/button/Button.vue";

const router = useRouter();
const authStore = useAuthStore();

/** @returns {Promise<void>} */
async function onLogout() {
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
        </nav>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="authStore.company" class="text-sm text-brand-brown/60">
          {{ authStore.company.name }}
        </span>
        <Button variant="ghost" size="sm" @click="onLogout">Chiqish</Button>
      </div>
    </header>
    <main class="p-6">
      <router-view />
    </main>
  </div>
</template>
