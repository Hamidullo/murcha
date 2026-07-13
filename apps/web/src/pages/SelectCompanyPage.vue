<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth.store.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const error = ref("");
const selectingId = ref(null);

/**
 * @param {string} companyId
 * @returns {Promise<void>}
 */
async function onSelect(companyId) {
  error.value = "";
  selectingId.value = companyId;
  try {
    await authStore.selectCompany(companyId);
    router.push({ name: "products" });
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t("selectCompany.errors.unexpected");
  } finally {
    selectingId.value = null;
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center px-4">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{{ t("selectCompany.title") }}</CardTitle>
        <CardDescription>{{ t("selectCompany.subtitle") }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-2">
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <Button
          v-for="item in authStore.pendingCompanies"
          :key="item.id"
          variant="outline"
          :disabled="selectingId === item.id"
          class="w-full justify-start"
          @click="onSelect(item.id)"
        >
          {{ item.name }}
        </Button>
      </CardContent>
    </Card>
  </main>
</template>
