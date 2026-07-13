<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as ordersApi from "../api/orders.api.js";
import { Card, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const STATUS_LABELS = computed(() => ({
  new: t("orders.status.new"),
  confirmed: t("orders.status.confirmed"),
  picking: t("orders.status.picking"),
  shipped: t("orders.status.shipped"),
  delivered: t("orders.status.delivered"),
  accepted: t("orders.status.accepted"),
  cancelled: t("orders.status.cancelled"),
}));

const {
  data: ordersData,
  isLoading,
  isError,
} = useQuery({
  queryKey: ["orders"],
  queryFn: ordersApi.listOrders,
});
const orders = computed(() => ordersData.value?.orders ?? []);
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-lg font-semibold text-brand-brown">{{ t("orders.title") }}</h1>

    <p v-if="isLoading" class="mt-4 text-sm text-brand-brown/60">{{ t("orders.loading") }}</p>
    <p v-else-if="isError" class="mt-4 text-sm text-red-600">{{ t("orders.loadError") }}</p>
    <p v-else-if="orders.length === 0" class="mt-4 text-sm text-brand-brown/60">
      {{ t("orders.empty") }}
    </p>

    <div class="mt-4 flex flex-col gap-3">
      <router-link
        v-for="order in orders"
        :key="order.id"
        :to="{ name: 'order-detail', params: { id: order.id } }"
      >
        <Card>
          <CardContent class="flex items-center justify-between p-4">
            <div>
              <p class="font-medium text-brand-brown">№ {{ order.number }}</p>
              <p class="text-sm text-brand-brown/60">
                {{ STATUS_LABELS[order.status] ?? order.status }}
              </p>
            </div>
            <p class="font-semibold text-brand-brown">
              {{ Number(order.total).toLocaleString("uz-UZ") }} {{ order.currency }}
            </p>
          </CardContent>
        </Card>
      </router-link>
    </div>
  </div>
</template>
