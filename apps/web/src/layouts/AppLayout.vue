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
      <div class="flex items-center gap-3">
        <img src="/murcha-logo.svg" alt="Murcha" class="h-8 w-auto" />
        <span v-if="authStore.company" class="text-sm text-brand-brown/60">
          {{ authStore.company.name }}
        </span>
      </div>
      <Button variant="ghost" size="sm" @click="onLogout">Chiqish</Button>
    </header>
    <main class="p-6">
      <router-view />
    </main>
  </div>
</template>
