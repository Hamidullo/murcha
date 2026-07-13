<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery } from "@tanstack/vue-query";
import * as debtsApi from "../api/debts.api.js";
import { Card, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const { data: aging, isLoading } = useQuery({
  queryKey: ["debts-aging"],
  queryFn: () => debtsApi.getAging(),
});

const counterparties = computed(() => aging.value?.counterparties ?? []);

const BUCKET_LABELS = computed(() => ({
  notDue: t("debtsAging.buckets.notDue"),
  d0_15: t("debtsAging.buckets.d0_15"),
  d16_30: t("debtsAging.buckets.d16_30"),
  d31_60: t("debtsAging.buckets.d31_60"),
  d60plus: t("debtsAging.buckets.d60plus"),
}));
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="text-2xl font-semibold text-brand-brown">{{ t("debtsAging.title") }}</h1>

    <Card class="mt-4">
      <CardContent class="pt-6">
        <p v-if="isLoading" class="text-sm text-brand-brown/60">{{ t("debtsAging.loading") }}</p>
        <p v-else-if="counterparties.length === 0" class="text-sm text-brand-brown/60">
          {{ t("debtsAging.empty") }}
        </p>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">{{ t("debtsAging.columns.counterparty") }}</th>
              <th v-for="(label, key) in BUCKET_LABELS" :key="key" class="text-right">
                {{ label }}
              </th>
              <th class="text-right">{{ t("debtsAging.columns.total") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cp in counterparties"
              :key="cp.counterpartyId"
              class="border-b border-brand-brown/5"
            >
              <td class="py-2">
                <router-link
                  :to="{ name: 'counterparty-statement', params: { id: cp.counterpartyId } }"
                  class="text-brand-brown underline hover:text-brand-brown/70"
                >
                  {{ cp.counterpartyName }}
                </router-link>
              </td>
              <td
                v-for="(label, key) in BUCKET_LABELS"
                :key="key"
                class="text-right"
                :class="{ 'font-semibold text-red-600': key !== 'notDue' && cp.buckets[key] > 0 }"
              >
                {{ cp.buckets[key] || "" }}
              </td>
              <td class="text-right font-semibold text-brand-brown">{{ cp.total }}</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
