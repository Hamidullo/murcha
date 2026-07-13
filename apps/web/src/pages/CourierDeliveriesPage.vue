<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as deliveriesApi from "../api/deliveries.api.js";
import { getSocket } from "../lib/socket.js";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardContent } from "@/components/ui/card";

const { t } = useI18n();
const router = useRouter();

const {
  data: deliveriesData,
  isLoading,
  isError,
} = useQuery({
  queryKey: ["deliveries", "assigned"],
  queryFn: () => deliveriesApi.listDeliveries({ status: "assigned" }),
});
const activeDelivery = computed(() => (deliveriesData.value?.deliveries ?? [])[0] ?? null);

const { data: detail } = useQuery({
  queryKey: computed(() => ["delivery", activeDelivery.value?.id]),
  queryFn: () => deliveriesApi.getDelivery(activeDelivery.value.id),
  enabled: computed(() => Boolean(activeDelivery.value)),
});

const stops = computed(() =>
  [...(detail.value?.orders ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
);

/** Ekran o'chmasin — dostavka paytida ilova ochiq turishi shart (PLAN.md F). */
let wakeLock = null;
async function acquireWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request("screen");
  } catch {
    // Qo'llab-quvvatlanmasa yoki ruxsat berilmasa — jim o'tkazib yuboriladi.
  }
}

/** Har 15 soniyada joriy GPS koordinatani serverga yuboradi. */
let gpsInterval = null;
function sendLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      getSocket()?.emit("courier:location", {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    () => {
      // Ruxsat berilmagan yoki xato — keyingi urinishda qayta harakat qilinadi.
    },
  );
}

onMounted(() => {
  acquireWakeLock();
  sendLocation();
  gpsInterval = setInterval(sendLocation, 15000);
});

onUnmounted(() => {
  wakeLock?.release().catch(() => {});
  clearInterval(gpsInterval);
});
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="text-2xl font-semibold text-brand-brown">{{ t("courierDeliveries.title") }}</h1>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">
      {{ t("courierDeliveries.loading") }}
    </p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">
      {{ t("courierDeliveries.loadError") }}
    </p>
    <p v-else-if="!activeDelivery" class="mt-6 text-sm text-brand-brown/60">
      {{ t("courierDeliveries.empty") }}
    </p>

    <div v-else class="mt-6 flex flex-col gap-3">
      <Card v-for="stop in stops" :key="stop.id">
        <CardContent class="flex items-center justify-between p-4">
          <div>
            <p class="font-medium text-brand-brown">№ {{ stop.order.number }}</p>
            <p class="text-sm text-brand-brown/60">
              {{
                stop.deliveredAt
                  ? t("courierDeliveries.stopStatus.delivered", { code: stop.acceptCode })
                  : t("courierDeliveries.stopStatus.inTransit")
              }}
            </p>
          </div>
          <Button
            v-if="!stop.deliveredAt"
            size="sm"
            @click="
              router.push({
                name: 'courier-delivery-detail',
                params: { deliveryId: activeDelivery.id, orderId: stop.orderId },
              })
            "
          >
            {{ t("courierDeliveries.deliverButton") }}
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
