<script setup>
import { useRouter } from "vue-router";
import { usePlatformAuthStore } from "../stores/platform-auth.store.js";
import Button from "@/components/ui/button/Button.vue";

const router = useRouter();
const platformAuthStore = usePlatformAuthStore();

function onLogout() {
  platformAuthStore.logout();
  router.push({ name: "platform-login" });
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
          <router-link :to="{ name: 'platform-companies' }" class="hover:text-brand-brown">
            Kompaniyalar
          </router-link>
        </nav>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="platformAuthStore.user" class="text-sm text-brand-brown/60">
          {{ platformAuthStore.user.fullName }}
        </span>
        <Button variant="ghost" size="sm" @click="onLogout">Chiqish</Button>
      </div>
    </header>
    <main class="p-6">
      <router-view />
    </main>
  </div>
</template>
