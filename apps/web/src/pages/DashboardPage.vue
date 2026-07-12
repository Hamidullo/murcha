<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import "../lib/echarts-setup.js";
import VChart from "vue-echarts";
import * as reportsApi from "../api/reports.api.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
    tooltip: { trigger: "axis" },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: "category", data: sales.map((s) => s.date) },
    yAxis: { type: "value" },
    series: [{ type: "line", data: sales.map((s) => s.total), smooth: true, areaStyle: {} }],
  };
});
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <h1 class="text-2xl font-semibold text-brand-brown">Dashboard</h1>

    <p v-if="isDashboardLoading" class="mt-4 text-sm text-brand-brown/60">Yuklanmoqda…</p>

    <template v-else-if="dashboard">
      <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent class="pt-6">
            <p class="text-sm text-brand-brown/60">Bugungi sotuv</p>
            <p class="text-xl font-semibold text-brand-brown">{{ dashboard.todaySales }} UZS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="pt-6">
            <p class="text-sm text-brand-brown/60">Kutilayotgan zakazlar</p>
            <p class="text-xl font-semibold text-brand-brown">{{ dashboard.pendingOrders }}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="pt-6">
            <p class="text-sm text-brand-brown/60">Kassa qoldig'i</p>
            <p v-if="cashEntries.length === 0" class="text-xl font-semibold text-brand-brown">—</p>
            <p
              v-for="[currency, amount] in cashEntries"
              :key="currency"
              class="text-xl font-semibold text-brand-brown"
            >
              {{ amount }} {{ currency }}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="pt-6">
            <p class="text-sm text-brand-brown/60">Jami qarzdorlik</p>
            <p class="text-xl font-semibold text-brand-brown">{{ dashboard.debtTotal }} UZS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="pt-6">
            <p class="text-sm text-brand-brown/60">Muddati o'tgan qarz</p>
            <p
              class="text-xl font-semibold"
              :class="dashboard.debtOverdue > 0 ? 'text-red-600' : 'text-brand-brown'"
            >
              {{ dashboard.debtOverdue }} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="pt-6">
            <p class="text-sm text-brand-brown/60">Tugayotgan mahsulotlar</p>
            <p
              class="text-xl font-semibold"
              :class="dashboard.lowStockCount > 0 ? 'text-amber-600' : 'text-brand-brown'"
            >
              {{ dashboard.lowStockCount }}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card class="mt-4">
        <CardHeader><CardTitle>Sotuv dinamikasi (30 kun)</CardTitle></CardHeader>
        <CardContent>
          <VChart :option="chartOption" style="height: 280px" autoresize />
        </CardContent>
      </Card>
    </template>
  </div>
</template>
