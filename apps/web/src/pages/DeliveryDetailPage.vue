<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import * as deliveriesApi from "../api/deliveries.api.js";
import * as companyMembersApi from "../api/company-members.api.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const STATUS_LABELS = { assigned: "Yo'lda", done: "Yakunlangan" };

const route = useRoute();
const deliveryId = computed(() => route.params.id);

const {
  data: delivery,
  isLoading,
  isError,
} = useQuery({
  queryKey: computed(() => ["delivery", deliveryId.value]),
  queryFn: () => deliveriesApi.getDelivery(deliveryId.value),
});

const { data: membersData } = useQuery({
  queryKey: ["company-members"],
  queryFn: companyMembersApi.listEmployees,
});
const members = computed(() => membersData.value?.members ?? []);

/**
 * @param {string} courierMemberId
 * @returns {string}
 */
function courierName(courierMemberId) {
  return members.value.find((m) => m.id === courierMemberId)?.user.fullName ?? "—";
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <p v-if="isLoading" class="text-sm text-brand-brown/60">Yuklanmoqda…</p>
    <p v-else-if="isError" class="text-sm text-red-600">Dostavkani yuklab bo'lmadi</p>

    <template v-else-if="delivery">
      <div>
        <h1 class="text-2xl font-semibold text-brand-brown">
          Dostavka — {{ courierName(delivery.courierMemberId) }}
        </h1>
        <p class="text-sm text-brand-brown/60">
          {{ STATUS_LABELS[delivery.status] ?? delivery.status }}
        </p>
      </div>

      <div class="mt-4 flex items-center justify-between text-brand-brown">
        <span class="text-sm">Kutilgan naqd</span>
        <span class="font-semibold">{{ Number(delivery.cashExpected) }}</span>
      </div>
      <div class="mt-1 flex items-center justify-between text-brand-brown">
        <span class="text-sm">Yig'ilgan naqd</span>
        <span class="font-semibold">{{ Number(delivery.cashCollected) }}</span>
      </div>

      <Card class="mt-4">
        <CardHeader><CardTitle>Bekatlar</CardTitle></CardHeader>
        <CardContent class="space-y-2">
          <div
            v-for="stop in delivery.orders"
            :key="stop.id"
            class="flex items-center justify-between rounded-md border border-brand-brown/10 px-3 py-2 text-sm"
          >
            <span class="text-brand-brown">№ {{ stop.order.number }}</span>
            <span class="text-brand-brown/70">
              {{ stop.deliveredAt ? `Yetkazildi (kod: ${stop.acceptCode})` : "Yo'lda" }}
            </span>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
