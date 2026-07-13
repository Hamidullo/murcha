<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as deliveriesApi from "../api/deliveries.api.js";
import * as companyMembersApi from "../api/company-members.api.js";
import * as cashApi from "../api/cash.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const STATUS_LABELS = computed(() => ({
  assigned: t("deliveryDetail.status.assigned"),
  done: t("deliveryDetail.status.done"),
}));

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
  return (
    members.value.find((m) => m.id === courierMemberId)?.user.fullName ??
    t("deliveryDetail.unknownCourier")
  );
}

// --- Kassaga topshirish (inkassatsiya) ---
const { data: registersData } = useQuery({
  queryKey: ["cash-registers"],
  queryFn: () => cashApi.listRegisters(),
});
const cashRegisterId = ref("");
const isSettling = ref(false);
const settleError = ref("");
const isSettled = ref(false);

/** @returns {Promise<void>} */
async function onSettleCash() {
  settleError.value = "";
  if (!cashRegisterId.value) {
    settleError.value = t("deliveryDetail.errors.registerRequired");
    return;
  }
  isSettling.value = true;
  try {
    await cashApi.createTransaction({
      cashRegisterId: cashRegisterId.value,
      type: "income",
      amount: Number(delivery.value.cashCollected),
      currency: "UZS",
      comment: t("deliveryDetail.cashTransactionComment", {
        courier: courierName(delivery.value.courierMemberId),
      }),
    });
    isSettled.value = true;
  } catch (err) {
    settleError.value =
      err instanceof ApiError ? err.message : t("deliveryDetail.errors.unexpected");
  } finally {
    isSettling.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <p v-if="isLoading" class="text-sm text-brand-brown/60">{{ t("deliveryDetail.loading") }}</p>
    <p v-else-if="isError" class="text-sm text-red-600">{{ t("deliveryDetail.loadError") }}</p>

    <template v-else-if="delivery">
      <div>
        <h1 class="text-2xl font-semibold text-brand-brown">
          {{ t("deliveryDetail.title", { courier: courierName(delivery.courierMemberId) }) }}
        </h1>
        <p class="text-sm text-brand-brown/60">
          {{ STATUS_LABELS[delivery.status] ?? delivery.status }}
        </p>
      </div>

      <div class="mt-4 flex items-center justify-between text-brand-brown">
        <span class="text-sm">{{ t("deliveryDetail.cashExpectedLabel") }}</span>
        <span class="font-semibold">{{ Number(delivery.cashExpected) }}</span>
      </div>
      <div class="mt-1 flex items-center justify-between text-brand-brown">
        <span class="text-sm">{{ t("deliveryDetail.cashCollectedLabel") }}</span>
        <span class="font-semibold">{{ Number(delivery.cashCollected) }}</span>
      </div>

      <Card v-if="Number(delivery.cashCollected) > 0" class="mt-4">
        <CardHeader
          ><CardTitle>{{ t("deliveryDetail.settleCard.title") }}</CardTitle></CardHeader
        >
        <CardContent class="flex flex-col gap-3">
          <p v-if="isSettled" class="text-sm text-green-700">
            {{
              t("deliveryDetail.settleCard.settledMessage", {
                amount: Number(delivery.cashCollected),
              })
            }}
          </p>
          <template v-else>
            <select
              v-model="cashRegisterId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="">{{ t("deliveryDetail.settleCard.registerPlaceholder") }}</option>
              <option v-for="r in registersData?.registers ?? []" :key="r.id" :value="r.id">
                {{ r.name }}
              </option>
            </select>
            <p v-if="settleError" class="text-sm text-red-600">{{ settleError }}</p>
            <Button :disabled="isSettling" class="self-start" @click="onSettleCash">
              {{
                isSettling
                  ? t("deliveryDetail.settleCard.submitting")
                  : t("deliveryDetail.settleCard.submitButton")
              }}
            </Button>
          </template>
        </CardContent>
      </Card>

      <Card class="mt-4">
        <CardHeader
          ><CardTitle>{{ t("deliveryDetail.stopsCard.title") }}</CardTitle></CardHeader
        >
        <CardContent class="space-y-2">
          <div
            v-for="stop in delivery.orders"
            :key="stop.id"
            class="flex items-center justify-between rounded-md border border-brand-brown/10 px-3 py-2 text-sm"
          >
            <span class="text-brand-brown">№ {{ stop.order.number }}</span>
            <span class="text-brand-brown/70">
              {{
                stop.deliveredAt
                  ? t("deliveryDetail.stopStatus.delivered", { code: stop.acceptCode })
                  : t("deliveryDetail.stopStatus.inTransit")
              }}
            </span>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
