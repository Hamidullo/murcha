<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as salePointsApi from "../api/sale-points.api.js";
import Button from "@/components/ui/button/Button.vue";

const { t } = useI18n();
const router = useRouter();

const {
  data: salePointsData,
  isLoading,
  isError,
} = useQuery({
  queryKey: ["sale-points"],
  queryFn: salePointsApi.listSalePoints,
});
const salePoints = computed(() => salePointsData.value?.salePoints ?? []);
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">{{ t("salePoints.title") }}</h1>
      <Button size="sm" @click="router.push({ name: 'sale-point-new' })">
        {{ t("salePoints.newButton") }}
      </Button>
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">{{ t("salePoints.loading") }}</p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">{{ t("salePoints.loadError") }}</p>
    <p v-else-if="salePoints.length === 0" class="mt-6 text-sm text-brand-brown/60">
      {{ t("salePoints.empty") }}
    </p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-brand-brown/10 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-brand-brown/10 text-brand-brown/60">
          <tr>
            <th class="px-4 py-3 font-medium">{{ t("salePoints.table.name") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("salePoints.table.address") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("salePoints.table.status") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="sp in salePoints"
            :key="sp.id"
            class="cursor-pointer border-b border-brand-brown/5 last:border-0 hover:bg-brand-cream"
            @click="router.push({ name: 'sale-point-edit', params: { id: sp.id } })"
          >
            <td class="px-4 py-3 text-brand-brown">{{ sp.name }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ sp.address ?? "—" }}</td>
            <td class="px-4 py-3 text-brand-brown/70">
              {{ sp.isActive ? t("salePoints.statusActive") : t("salePoints.statusInactive") }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
