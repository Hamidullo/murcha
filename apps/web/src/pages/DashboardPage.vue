<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import {
  TrendingUp,
  ShoppingCart,
  Wallet,
  Banknote,
  TriangleAlert,
  PackageX,
} from "lucide-vue-next";
import "../lib/echarts-setup.js";
import VChart from "vue-echarts";
import * as reportsApi from "../api/reports.api.js";
import OnboardingChecklist from "../components/onboarding/OnboardingChecklist.vue";
import { areaGradientStyle, tooltipStyle, axisStyle, DONUT_PALETTE } from "../lib/chart-theme.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const { data: dashboard, isLoading: isDashboardLoading } = useQuery({
  queryKey: ["reports-dashboard"],
  queryFn: () => reportsApi.getDashboard(),
});

const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { data: salesData } = useQuery({
  queryKey: ["reports-sales", "dashboard"],
  queryFn: () => reportsApi.getSales({ from: thirtyDaysAgo.toISOString().slice(0, 10) }),
});

const cashEntries = computed(() => Object.entries(dashboard.value?.cashBalanceByCurrency ?? {}));

const chartOption = computed(() => {
  const sales = salesData.value?.sales ?? [];
  return {
    tooltip: tooltipStyle(),
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: "category", data: sales.map((s) => s.date), ...axisStyle() },
    yAxis: { type: "value", ...axisStyle() },
    series: [
      {
        type: "line",
        data: sales.map((s) => s.total),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: "#f59e0b", width: 3 },
        itemStyle: { color: "#f59e0b" },
        areaStyle: areaGradientStyle(),
      },
    ],
  };
});

/** Faqat 2+ valyuta bo'lganda mazmunli — bitta valyutada donut bir bo'lakli bo'lib qolardi. */
const donutOption = computed(() => ({
  tooltip: { ...tooltipStyle(), trigger: "item" },
  color: DONUT_PALETTE,
  series: [
    {
      type: "pie",
      radius: ["55%", "80%"],
      itemStyle: { borderColor: "#fff8f0", borderWidth: 2 },
      label: { color: "#4a2b12", fontSize: 12 },
      data: cashEntries.value.map(([currency, amount]) => ({ name: currency, value: amount })),
    },
  ],
}));
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <h1 class="text-2xl font-semibold text-brand-brown">{{ t("dashboard.title") }}</h1>

    <OnboardingChecklist class="mt-4" />

    <p v-if="isDashboardLoading" class="mt-4 text-sm text-brand-brown/60">
      {{ t("dashboard.loading") }}
    </p>

    <template v-else-if="dashboard">
      <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent class="flex items-start justify-between pt-6">
            <div>
              <p class="text-sm text-brand-brown/60">{{ t("dashboard.cards.todaySales") }}</p>
              <p class="text-xl font-semibold text-brand-brown">{{ dashboard.todaySales }} UZS</p>
            </div>
            <span class="rounded-full bg-brand-amber/10 p-2 text-brand-amber">
              <TrendingUp class="h-4 w-4" />
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="flex items-start justify-between pt-6">
            <div>
              <p class="text-sm text-brand-brown/60">{{ t("dashboard.cards.pendingOrders") }}</p>
              <p class="text-xl font-semibold text-brand-brown">{{ dashboard.pendingOrders }}</p>
            </div>
            <span class="rounded-full bg-brand-amber/10 p-2 text-brand-amber">
              <ShoppingCart class="h-4 w-4" />
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="flex items-start justify-between pt-6">
            <div>
              <p class="text-sm text-brand-brown/60">{{ t("dashboard.cards.cashBalance") }}</p>
              <p v-if="cashEntries.length === 0" class="text-xl font-semibold text-brand-brown">
                —
              </p>
              <p
                v-for="[currency, amount] in cashEntries"
                :key="currency"
                class="text-xl font-semibold text-brand-brown"
              >
                {{ amount }} {{ currency }}
              </p>
            </div>
            <span class="rounded-full bg-brand-amber/10 p-2 text-brand-amber">
              <Wallet class="h-4 w-4" />
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="flex items-start justify-between pt-6">
            <div>
              <p class="text-sm text-brand-brown/60">{{ t("dashboard.cards.totalDebt") }}</p>
              <p class="text-xl font-semibold text-brand-brown">{{ dashboard.debtTotal }} UZS</p>
            </div>
            <span class="rounded-full bg-brand-amber/10 p-2 text-brand-amber">
              <Banknote class="h-4 w-4" />
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="flex items-start justify-between pt-6">
            <div>
              <p class="text-sm text-brand-brown/60">{{ t("dashboard.cards.overdueDebt") }}</p>
              <p
                class="text-xl font-semibold"
                :class="dashboard.debtOverdue > 0 ? 'text-red-600' : 'text-brand-brown'"
              >
                {{ dashboard.debtOverdue }} UZS
              </p>
            </div>
            <span
              class="rounded-full p-2"
              :class="
                dashboard.debtOverdue > 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-brand-amber/10 text-brand-amber'
              "
            >
              <TriangleAlert class="h-4 w-4" />
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="flex items-start justify-between pt-6">
            <div>
              <p class="text-sm text-brand-brown/60">{{ t("dashboard.cards.lowStock") }}</p>
              <p
                class="text-xl font-semibold"
                :class="dashboard.lowStockCount > 0 ? 'text-amber-600' : 'text-brand-brown'"
              >
                {{ dashboard.lowStockCount }}
              </p>
            </div>
            <span class="rounded-full bg-brand-amber/10 p-2 text-brand-amber">
              <PackageX class="h-4 w-4" />
            </span>
          </CardContent>
        </Card>
      </div>

      <div class="mt-4 grid gap-4" :class="cashEntries.length >= 2 ? 'sm:grid-cols-3' : ''">
        <Card :class="cashEntries.length >= 2 ? 'sm:col-span-2' : ''">
          <CardHeader
            ><CardTitle>{{ t("dashboard.chartTitle") }}</CardTitle></CardHeader
          >
          <CardContent>
            <VChart :option="chartOption" style="height: 280px" autoresize />
          </CardContent>
        </Card>

        <Card v-if="cashEntries.length >= 2">
          <CardHeader>
            <CardTitle>{{ t("dashboard.cashByCurrencyTitle") }}</CardTitle>
          </CardHeader>
          <CardContent>
            <VChart :option="donutOption" style="height: 280px" autoresize />
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
