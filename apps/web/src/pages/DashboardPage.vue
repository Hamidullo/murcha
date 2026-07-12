<script setup>
import { useAuthStore } from "../stores/auth.store.js";

const authStore = useAuthStore();
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-brand-brown">
      Salom, {{ authStore.user?.fullName ?? "" }}!
    </h1>
    <p class="mt-2 text-sm text-brand-brown/60">
      Katalog sahifasi Faza 2 Task 8'da shu yerga qo'shiladi.
    </p>
  </div>
</template>
