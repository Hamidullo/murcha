<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as inventoryCountsApi from "../api/inventory-counts.api.js";
import * as warehousesApi from "../api/warehouses.api.js";
import Button from "@/components/ui/button/Button.vue";

const { t } = useI18n();

const STATUS_LABELS = computed(() => ({
  in_progress: t("inventoryCounts.status.in_progress"),
  review: t("inventoryCounts.status.review"),
  approved: t("inventoryCounts.status.approved"),
}));

const router = useRouter();

const warehouseId = ref("");
const status = ref("");

const { data: warehousesData } = useQuery({
  queryKey: ["warehouses"],
  queryFn: warehousesApi.listWarehouses,
});
const warehouses = computed(() => warehousesData.value?.warehouses ?? []);

const {
  data: countsData,
  isLoading,
  isError,
} = useQuery({
  queryKey: computed(() => ["inventory-counts", warehouseId.value, status.value]),
  queryFn: () =>
    inventoryCountsApi.listInventoryCounts({
      warehouseId: warehouseId.value || undefined,
      status: status.value || undefined,
    }),
});
const counts = computed(() => countsData.value?.counts ?? []);

/**
 * @param {string} id
 * @returns {string}
 */
function warehouseName(id) {
  return warehouses.value.find((w) => w.id === id)?.name ?? "—";
}

/**
 * @param {string} id
 * @returns {void}
 */
function goToCount(id) {
  router.push({ name: "inventory-count-detail", params: { id } });
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">{{ t("inventoryCounts.title") }}</h1>
      <Button size="sm" @click="router.push({ name: 'inventory-count-new' })">
        {{ t("inventoryCounts.newButton") }}
      </Button>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <select
        v-model="warehouseId"
        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
      >
        <option value="">{{ t("inventoryCounts.allWarehouses") }}</option>
        <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
          {{ warehouse.name }}
        </option>
      </select>
      <select
        v-model="status"
        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
      >
        <option value="">{{ t("inventoryCounts.allStatuses") }}</option>
        <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">
      {{ t("inventoryCounts.loading") }}
    </p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">
      {{ t("inventoryCounts.loadError") }}
    </p>
    <p v-else-if="counts.length === 0" class="mt-6 text-sm text-brand-brown/60">
      {{ t("inventoryCounts.empty") }}
    </p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-brand-brown/10 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-brand-brown/10 text-brand-brown/60">
          <tr>
            <th class="px-4 py-3 font-medium">{{ t("inventoryCounts.table.warehouse") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("inventoryCounts.table.status") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("inventoryCounts.table.startedAt") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="count in counts"
            :key="count.id"
            class="cursor-pointer border-b border-brand-brown/5 last:border-0 hover:bg-brand-cream"
            @click="goToCount(count.id)"
          >
            <td class="px-4 py-3 text-brand-brown">{{ warehouseName(count.warehouseId) }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ STATUS_LABELS[count.status] }}</td>
            <td class="px-4 py-3 text-brand-brown/70">
              {{ count.startedAt ? new Date(count.startedAt).toLocaleString("uz-UZ") : "—" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
