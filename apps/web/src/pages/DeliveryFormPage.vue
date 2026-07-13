<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as deliveriesApi from "../api/deliveries.api.js";
import * as ordersApi from "../api/orders.api.js";
import * as companyMembersApi from "../api/company-members.api.js";
import * as salePointsApi from "../api/sale-points.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardContent } from "@/components/ui/card";

const { t } = useI18n();
const router = useRouter();
const queryClient = useQueryClient();

const { data: membersData } = useQuery({
  queryKey: ["company-members"],
  queryFn: companyMembersApi.listEmployees,
});
const couriers = computed(() =>
  (membersData.value?.members ?? []).filter((m) => m.status === "active"),
);

const { data: salePointsData } = useQuery({
  queryKey: ["sale-points"],
  queryFn: salePointsApi.listSalePoints,
});
const salePoints = computed(() => salePointsData.value?.salePoints ?? []);

const { data: ordersData, isLoading } = useQuery({
  queryKey: ["orders", "shipped"],
  queryFn: () => ordersApi.listOrders({ status: "shipped" }),
});
const shippedOrders = computed(() => ordersData.value?.orders ?? []);

/**
 * @param {string} id
 * @returns {string}
 */
function salePointName(id) {
  return salePoints.value.find((sp) => sp.id === id)?.name ?? t("deliveryForm.unknownSalePoint");
}

const courierMemberId = ref("");
const selectedOrderIds = ref([]);
const cashExpected = computed(() =>
  shippedOrders.value
    .filter((o) => selectedOrderIds.value.includes(o.id))
    .reduce((sum, o) => sum + Number(o.total), 0),
);

const submitError = ref("");
const isSubmitting = ref(false);

/** @returns {Promise<void>} */
async function onSubmit() {
  submitError.value = "";
  if (!courierMemberId.value || selectedOrderIds.value.length === 0) {
    submitError.value = t("deliveryForm.errors.selectRequired");
    return;
  }
  isSubmitting.value = true;
  try {
    const delivery = await deliveriesApi.createDelivery({
      courierMemberId: courierMemberId.value,
      orderIds: selectedOrderIds.value,
    });
    queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    router.push({ name: "delivery-detail", params: { id: delivery.id } });
  } catch (err) {
    submitError.value = err instanceof ApiError ? err.message : t("deliveryForm.errors.unexpected");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="text-2xl font-semibold text-brand-brown">{{ t("deliveryForm.title") }}</h1>

    <Card class="mt-4">
      <CardContent class="space-y-4 p-4">
        <div>
          <label class="text-sm font-medium text-brand-brown">
            {{ t("deliveryForm.courierLabel") }}
          </label>
          <select
            v-model="courierMemberId"
            class="mt-1 h-10 w-full rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
          >
            <option value="">{{ t("deliveryForm.courierPlaceholder") }}</option>
            <option v-for="c in couriers" :key="c.id" :value="c.id">
              {{ c.user.fullName }} — {{ c.role.name }}
            </option>
          </select>
        </div>

        <div>
          <p class="text-sm font-medium text-brand-brown">{{ t("deliveryForm.ordersLabel") }}</p>
          <p v-if="isLoading" class="mt-2 text-sm text-brand-brown/60">
            {{ t("deliveryForm.loading") }}
          </p>
          <p v-else-if="shippedOrders.length === 0" class="mt-2 text-sm text-brand-brown/60">
            {{ t("deliveryForm.noOrders") }}
          </p>
          <div v-else class="mt-2 flex flex-col gap-2">
            <label
              v-for="o in shippedOrders"
              :key="o.id"
              class="flex items-center gap-3 rounded-md border border-brand-brown/10 px-3 py-2 text-sm"
            >
              <input v-model="selectedOrderIds" type="checkbox" :value="o.id" />
              <span class="flex-1 text-brand-brown">№ {{ o.number }}</span>
              <span class="text-brand-brown/60">{{ salePointName(o.salePointId) }}</span>
              <span class="text-brand-brown/70">{{ Number(o.total) }} {{ o.currency }}</span>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-between text-brand-brown">
          <span class="text-sm font-medium">{{ t("deliveryForm.cashExpectedLabel") }}</span>
          <span class="font-semibold">{{ cashExpected }}</span>
        </div>

        <p v-if="submitError" class="text-sm text-red-600">{{ submitError }}</p>

        <Button :disabled="isSubmitting" @click="onSubmit">
          {{ t("deliveryForm.submitButton") }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
