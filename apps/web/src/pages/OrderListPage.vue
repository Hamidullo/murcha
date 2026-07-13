<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useQuery } from "@tanstack/vue-query";
import * as ordersApi from "../api/orders.api.js";
import * as salePointsApi from "../api/sale-points.api.js";
import * as warehousesApi from "../api/warehouses.api.js";

const router = useRouter();
const { t } = useI18n();
const status = ref("");

const STATUS_LABELS = computed(() => ({
  new: t("orders.status.new"),
  confirmed: t("orders.status.confirmed"),
  picking: t("orders.status.picking"),
  shipped: t("orders.status.shipped"),
  delivered: t("orders.status.delivered"),
  accepted: t("orders.status.accepted"),
  cancelled: t("orders.status.cancelled"),
}));

const { data: salePointsData } = useQuery({
  queryKey: ["sale-points"],
  queryFn: salePointsApi.listSalePoints,
});
const salePoints = computed(() => salePointsData.value?.salePoints ?? []);

const { data: warehousesData } = useQuery({
  queryKey: ["warehouses"],
  queryFn: warehousesApi.listWarehouses,
});
const warehouses = computed(() => warehousesData.value?.warehouses ?? []);

const {
  data: ordersData,
  isLoading,
  isError,
} = useQuery({
  queryKey: computed(() => ["orders", status.value]),
  queryFn: () => ordersApi.listOrders({ status: status.value || undefined }),
});
const orders = computed(() => ordersData.value?.orders ?? []);

/**
 * @param {string} id
 * @returns {string}
 */
function salePointName(id) {
  return salePoints.value.find((sp) => sp.id === id)?.name ?? "—";
}

/**
 * @param {string} id
 * @returns {string}
 */
function warehouseName(id) {
  return warehouses.value.find((w) => w.id === id)?.name ?? "—";
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-brand-brown">{{ t("orders.title") }}</h1>

    <div class="mt-4 flex flex-wrap gap-3">
      <select
        v-model="status"
        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
      >
        <option value="">{{ t("orders.filter.allStatuses") }}</option>
        <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">{{ t("orders.loading") }}</p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">{{ t("orders.loadError") }}</p>
    <p v-else-if="orders.length === 0" class="mt-6 text-sm text-brand-brown/60">
      {{ t("orders.empty") }}
    </p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-brand-brown/10 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-brand-brown/10 text-brand-brown/60">
          <tr>
            <th class="px-4 py-3 font-medium">{{ t("orders.table.number") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("orders.table.salePoint") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("orders.table.warehouse") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("orders.table.status") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("orders.table.total") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in orders"
            :key="order.id"
            class="cursor-pointer border-b border-brand-brown/5 last:border-0 hover:bg-brand-cream"
            @click="router.push({ name: 'order-detail', params: { id: order.id } })"
          >
            <td class="px-4 py-3 text-brand-brown">{{ order.number }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ salePointName(order.salePointId) }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ warehouseName(order.warehouseId) }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ STATUS_LABELS[order.status] }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ Number(order.total) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
