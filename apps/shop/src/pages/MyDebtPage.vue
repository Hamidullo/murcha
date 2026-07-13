<script setup>
import { ref, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as debtsApi from "../api/debts.api.js";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const {
  data: balanceData,
  isLoading: isBalanceLoading,
  isError: isBalanceError,
} = useQuery({
  queryKey: ["my-debt-balance"],
  queryFn: debtsApi.getMyBalance,
});

const from = ref("");
const to = ref("");

const { data: statement, isLoading: isStatementLoading } = useQuery({
  queryKey: computed(() => ["my-debt-statement", from.value, to.value]),
  queryFn: () =>
    debtsApi.getMyStatement({ from: from.value || undefined, to: to.value || undefined }),
});

const hasOverdue = computed(() =>
  (statement.value?.movements ?? []).some(
    (m) => m.type === "order" && m.dueDate && new Date(m.dueDate) < new Date() && m.balance > 0,
  ),
);
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-lg font-semibold text-brand-brown">{{ t("myDebt.title") }}</h1>

    <Card class="mt-4">
      <CardContent class="p-4">
        <p v-if="isBalanceLoading" class="text-sm text-brand-brown/60">
          {{ t("myDebt.loading") }}
        </p>
        <p v-else-if="isBalanceError" class="text-sm text-red-600">
          {{ t("myDebt.loadError") }}
        </p>
        <template v-else-if="balanceData">
          <p class="text-sm text-brand-brown/60">{{ t("myDebt.currentBalance") }}</p>
          <p
            class="text-2xl font-semibold"
            :class="hasOverdue ? 'text-red-600' : 'text-brand-brown'"
          >
            {{ balanceData.balance.toLocaleString("uz-UZ") }} {{ balanceData.currency }}
          </p>
        </template>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardContent class="flex gap-3 p-4">
        <div class="flex flex-1 flex-col gap-1.5">
          <Label for="from">{{ t("myDebt.from") }}</Label>
          <Input id="from" v-model="from" type="date" />
        </div>
        <div class="flex flex-1 flex-col gap-1.5">
          <Label for="to">{{ t("myDebt.to") }}</Label>
          <Input id="to" v-model="to" type="date" />
        </div>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("myDebt.history") }}</CardTitle></CardHeader
      >
      <CardContent class="p-4">
        <p v-if="isStatementLoading" class="text-sm text-brand-brown/60">
          {{ t("myDebt.loading") }}
        </p>
        <p
          v-else-if="!statement || statement.movements.length === 0"
          class="text-sm text-brand-brown/60"
        >
          {{ t("myDebt.noMovements") }}
        </p>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="m in statement.movements"
            :key="m.id"
            class="flex items-center justify-between border-b border-brand-brown/5 pb-2 text-sm"
          >
            <div>
              <p class="text-brand-brown">
                {{ m.orderNumber ? `№ ${m.orderNumber}` : m.type }}
              </p>
              <p class="text-xs text-brand-brown/50">
                {{ new Date(m.createdAt).toLocaleDateString("uz-UZ") }}
              </p>
            </div>
            <div class="text-right">
              <p :class="m.amount < 0 ? 'text-green-700' : 'text-brand-brown'">
                {{ m.amount > 0 ? "+" : "" }}{{ m.amount.toLocaleString("uz-UZ") }}
              </p>
              <p class="text-xs text-brand-brown/50">{{ m.balance.toLocaleString("uz-UZ") }}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
