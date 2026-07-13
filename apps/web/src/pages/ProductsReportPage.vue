<script setup>
import { ref, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as reportsApi from "../api/reports.api.js";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const from = ref("");
const to = ref("");

const { data: productsData } = useQuery({
  queryKey: computed(() => ["reports-products", from.value, to.value]),
  queryFn: () =>
    reportsApi.getProducts({ from: from.value || undefined, to: to.value || undefined }),
});

const products = computed(() => productsData.value?.products ?? []);

/**
 * @param {number | null} value
 * @returns {string}
 */
function formatOrDash(value) {
  return value == null ? "—" : String(Math.round(value));
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">{{ t("productsReport.title") }}</h1>
      <nav class="flex gap-3 text-sm">
        <router-link :to="{ name: 'reports-sales' }" class="text-brand-brown underline">
          {{ t("productsReport.nav.sales") }}
        </router-link>
        <router-link :to="{ name: 'reports-stock-turnover' }" class="text-brand-brown underline">
          {{ t("productsReport.nav.stockTurnover") }}
        </router-link>
      </nav>
    </div>

    <Card class="mt-4">
      <CardContent class="flex flex-wrap items-end gap-3 pt-6">
        <div class="flex flex-col gap-1.5">
          <Label for="from">{{ t("productsReport.filters.from") }}</Label>
          <Input id="from" v-model="from" type="date" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="to">{{ t("productsReport.filters.to") }}</Label>
          <Input id="to" v-model="to" type="date" />
        </div>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("productsReport.tableTitle") }}</CardTitle></CardHeader
      >
      <CardContent>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">{{ t("productsReport.table.product") }}</th>
              <th class="text-right">{{ t("productsReport.table.qty") }}</th>
              <th class="text-right">{{ t("productsReport.table.revenue") }}</th>
              <th class="text-right">{{ t("productsReport.table.cost") }}</th>
              <th class="text-right">{{ t("productsReport.table.margin") }}</th>
              <th class="text-right">{{ t("productsReport.table.marginPct") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.productId" class="border-b border-brand-brown/5">
              <td class="py-2">
                {{ p.name }} <span class="text-brand-brown/50">({{ p.sku }})</span>
              </td>
              <td class="text-right">{{ p.qty }}</td>
              <td class="text-right">{{ p.revenue }}</td>
              <td class="text-right">{{ formatOrDash(p.cost) }}</td>
              <td
                class="text-right font-medium"
                :class="p.margin != null && p.margin < 0 ? 'text-red-600' : ''"
              >
                {{ formatOrDash(p.margin) }}
              </td>
              <td class="text-right">
                {{ p.marginPct != null ? `${Math.round(p.marginPct)}%` : "—" }}
              </td>
            </tr>
            <tr v-if="products.length === 0">
              <td colspan="6" class="py-4 text-center text-brand-brown/50">
                {{ t("productsReport.empty") }}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
