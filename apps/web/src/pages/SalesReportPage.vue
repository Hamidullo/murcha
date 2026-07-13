<script setup>
import { ref, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import "../lib/echarts-setup.js";
import VChart from "vue-echarts";
import * as reportsApi from "../api/reports.api.js";
import { barGradientStyle, tooltipStyle, axisStyle } from "../lib/chart-theme.js";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const from = ref("");
const to = ref("");

const { data: salesData } = useQuery({
  queryKey: computed(() => ["reports-sales", from.value, to.value]),
  queryFn: () => reportsApi.getSales({ from: from.value || undefined, to: to.value || undefined }),
});

const sales = computed(() => salesData.value?.sales ?? []);
const totalSum = computed(() => sales.value.reduce((sum, s) => sum + s.total, 0));

const chartOption = computed(() => ({
  tooltip: tooltipStyle(),
  grid: { left: 60, right: 20, top: 20, bottom: 30 },
  xAxis: { type: "category", data: sales.value.map((s) => s.date), ...axisStyle() },
  yAxis: { type: "value", ...axisStyle() },
  series: [
    { type: "bar", data: sales.value.map((s) => s.total), barMaxWidth: 32, ...barGradientStyle() },
  ],
}));
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">{{ t("salesReport.title") }}</h1>
      <nav class="flex gap-3 text-sm">
        <router-link :to="{ name: 'reports-products' }" class="text-brand-brown underline">
          {{ t("salesReport.nav.products") }}
        </router-link>
        <router-link :to="{ name: 'reports-stock-turnover' }" class="text-brand-brown underline">
          {{ t("salesReport.nav.stockTurnover") }}
        </router-link>
        <router-link :to="{ name: 'debts-aging' }" class="text-brand-brown underline">
          {{ t("salesReport.nav.debtsAging") }}
        </router-link>
      </nav>
    </div>

    <Card class="mt-4">
      <CardContent class="flex flex-wrap items-end gap-3 pt-6">
        <div class="flex flex-col gap-1.5">
          <Label for="from">{{ t("salesReport.filters.from") }}</Label>
          <Input id="from" v-model="from" type="date" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="to">{{ t("salesReport.filters.to") }}</Label>
          <Input id="to" v-model="to" type="date" />
        </div>
        <div class="ml-auto text-right">
          <p class="text-sm text-brand-brown/60">{{ t("salesReport.total") }}</p>
          <p class="text-xl font-semibold text-brand-brown">{{ totalSum }} UZS</p>
        </div>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("salesReport.chartTitle") }}</CardTitle></CardHeader
      >
      <CardContent>
        <VChart v-if="sales.length > 0" :option="chartOption" style="height: 320px" autoresize />
        <p v-else class="text-sm text-brand-brown/60">{{ t("salesReport.empty") }}</p>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardContent class="pt-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">{{ t("salesReport.table.date") }}</th>
              <th class="text-right">{{ t("salesReport.table.ordersCount") }}</th>
              <th class="text-right">{{ t("salesReport.table.total") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sales" :key="s.date" class="border-b border-brand-brown/5">
              <td class="py-2">{{ s.date }}</td>
              <td class="text-right">{{ s.count }}</td>
              <td class="text-right font-medium">{{ s.total }}</td>
            </tr>
            <tr v-if="sales.length === 0">
              <td colspan="3" class="py-4 text-center text-brand-brown/50">
                {{ t("salesReport.empty") }}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
