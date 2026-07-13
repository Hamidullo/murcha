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

const { data: turnoverData } = useQuery({
  queryKey: computed(() => ["reports-stock-turnover", from.value, to.value]),
  queryFn: () =>
    reportsApi.getStockTurnover({ from: from.value || undefined, to: to.value || undefined }),
});

const products = computed(() => turnoverData.value?.products ?? []);

/**
 * @param {number | null} value
 * @returns {string}
 */
function formatOrDash(value) {
  return value == null ? "—" : String(Math.round(value * 100) / 100);
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">{{ t("stockTurnover.title") }}</h1>
      <nav class="flex gap-3 text-sm">
        <router-link :to="{ name: 'reports-sales' }" class="text-brand-brown underline">
          {{ t("stockTurnover.nav.sales") }}
        </router-link>
        <router-link :to="{ name: 'reports-products' }" class="text-brand-brown underline">
          {{ t("stockTurnover.nav.products") }}
        </router-link>
      </nav>
    </div>

    <Card class="mt-4">
      <CardContent class="flex flex-wrap items-end gap-3 pt-6">
        <div class="flex flex-col gap-1.5">
          <Label for="from">{{ t("stockTurnover.filters.from") }}</Label>
          <Input id="from" v-model="from" type="date" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="to">{{ t("stockTurnover.filters.to") }}</Label>
          <Input id="to" v-model="to" type="date" />
        </div>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("stockTurnover.tableTitle") }}</CardTitle></CardHeader
      >
      <CardContent>
        <p class="mb-3 text-xs text-brand-brown/50">
          {{ t("stockTurnover.hint") }}
        </p>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">{{ t("stockTurnover.table.product") }}</th>
              <th class="text-right">{{ t("stockTurnover.table.outboundQty") }}</th>
              <th class="text-right">{{ t("stockTurnover.table.outboundValue") }}</th>
              <th class="text-right">{{ t("stockTurnover.table.avgStock") }}</th>
              <th class="text-right">{{ t("stockTurnover.table.turnover") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.productId" class="border-b border-brand-brown/5">
              <td class="py-2">{{ p.name }}</td>
              <td class="text-right">{{ p.outboundQty }}</td>
              <td class="text-right">{{ p.outboundValue }}</td>
              <td class="text-right">{{ formatOrDash(p.avgStockValue) }}</td>
              <td class="text-right font-medium">{{ formatOrDash(p.turnoverRatio) }}</td>
            </tr>
            <tr v-if="products.length === 0">
              <td colspan="5" class="py-4 text-center text-brand-brown/50">
                {{ t("stockTurnover.empty") }}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
