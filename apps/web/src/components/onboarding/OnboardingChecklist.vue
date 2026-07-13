<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as warehousesApi from "../../api/warehouses.api.js";
import * as productsApi from "../../api/products.api.js";
import * as salePointsApi from "../../api/sale-points.api.js";
import * as ordersApi from "../../api/orders.api.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/**
 * Onboarding checklist — mavjud GET endpointlardan hisoblanadi, alohida
 * DB ustuni/progress yozuvi yo'q (PLAN.md 6.4-oqim: sklad → mahsulot →
 * sotuv nuqtasi → birinchi zakaz). Barcha bosqich bajarilsa komponent
 * o'zini yashiradi.
 */
const { t } = useI18n();

const { data: warehousesData } = useQuery({
  queryKey: ["warehouses"],
  queryFn: warehousesApi.listWarehouses,
});
const { data: productsData } = useQuery({
  queryKey: ["products"],
  queryFn: () => productsApi.listProducts(),
});
const { data: salePointsData } = useQuery({
  queryKey: ["sale-points"],
  queryFn: salePointsApi.listSalePoints,
});
const { data: ordersData } = useQuery({
  queryKey: ["orders"],
  queryFn: () => ordersApi.listOrders(),
});

const steps = computed(() => [
  { key: "warehouse", done: (warehousesData.value?.warehouses?.length ?? 0) > 0, to: "warehouses" },
  { key: "products", done: (productsData.value?.products?.length ?? 0) > 0, to: "products" },
  {
    key: "salePoint",
    done: (salePointsData.value?.salePoints?.length ?? 0) > 0,
    to: "sale-points",
  },
  { key: "firstOrder", done: (ordersData.value?.orders?.length ?? 0) > 0, to: "orders" },
]);

const allDone = computed(() => steps.value.every((s) => s.done));
</script>

<template>
  <Card v-if="!allDone" class="mb-4 border-brand-amber/40">
    <CardHeader>
      <CardTitle>{{ t("onboarding.title") }}</CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-2">
      <router-link
        v-for="step in steps"
        :key="step.key"
        :to="{ name: step.to }"
        class="flex items-center gap-2 text-sm"
        :class="step.done ? 'text-brand-brown/40 line-through' : 'text-brand-brown hover:underline'"
      >
        <span>{{ step.done ? "✅" : "⬜" }}</span>
        {{ t(`onboarding.steps.${step.key}`) }}
      </router-link>
    </CardContent>
  </Card>
</template>
