<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import * as debtsApi from "../api/debts.api.js";
import { Card, CardContent } from "@/components/ui/card";

const { data: aging, isLoading } = useQuery({
  queryKey: ["debts-aging"],
  queryFn: () => debtsApi.getAging(),
});

const counterparties = computed(() => aging.value?.counterparties ?? []);

const BUCKET_LABELS = {
  notDue: "Muddati kelmagan",
  d0_15: "0–15 kun",
  d16_30: "16–30 kun",
  d31_60: "31–60 kun",
  d60plus: "60+ kun",
};
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="text-2xl font-semibold text-brand-brown">Qarz yoshi hisoboti</h1>

    <Card class="mt-4">
      <CardContent class="pt-6">
        <p v-if="isLoading" class="text-sm text-brand-brown/60">Yuklanmoqda…</p>
        <p v-else-if="counterparties.length === 0" class="text-sm text-brand-brown/60">
          Ochiq qarz yo'q
        </p>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">Kontragent</th>
              <th v-for="(label, key) in BUCKET_LABELS" :key="key" class="text-right">
                {{ label }}
              </th>
              <th class="text-right">Jami</th>
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
