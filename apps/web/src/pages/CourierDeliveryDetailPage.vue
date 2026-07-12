<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import * as deliveriesApi from "../api/deliveries.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import { Card, CardContent } from "@/components/ui/card";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();

const deliveryId = computed(() => route.params.deliveryId);
const orderId = computed(() => route.params.orderId);

const { data: delivery } = useQuery({
  queryKey: computed(() => ["delivery", deliveryId.value]),
  queryFn: () => deliveriesApi.getDelivery(deliveryId.value),
});
const stop = computed(() => delivery.value?.orders.find((o) => o.orderId === orderId.value));

const cashCollected = ref("");
const isSubmitting = ref(false);
const submitError = ref("");
const acceptCode = ref("");

/** @returns {Promise<void>} */
async function onDeliver() {
  submitError.value = "";
  isSubmitting.value = true;
  try {
    const result = await deliveriesApi.deliverStop(deliveryId.value, orderId.value, {
      cashCollected: cashCollected.value === "" ? undefined : Number(cashCollected.value),
    });
    acceptCode.value = result.acceptCode;
    queryClient.invalidateQueries({ queryKey: ["delivery", deliveryId.value] });
    queryClient.invalidateQueries({ queryKey: ["deliveries"] });
  } catch (err) {
    submitError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-2xl font-semibold text-brand-brown">№ {{ stop?.order?.number ?? "" }}</h1>

    <template v-if="acceptCode">
      <Card class="mt-4">
        <CardContent class="p-4 text-center">
          <p class="text-sm text-brand-brown/60">Yetkazildi. Do'konga shu kodni ayting:</p>
          <p class="mt-2 text-3xl font-semibold tracking-widest text-brand-brown">
            {{ acceptCode }}
          </p>
        </CardContent>
      </Card>
      <Button
        class="mt-4 w-full"
        variant="outline"
        @click="router.push({ name: 'courier-deliveries' })"
      >
        Marshrutga qaytish
      </Button>
    </template>

    <template v-else-if="stop">
      <Card class="mt-4">
        <CardContent class="space-y-4 p-4">
          <div>
            <label class="text-sm font-medium text-brand-brown">Qabul qilingan naqd summa</label>
            <Input v-model="cashCollected" type="number" class="mt-1" />
          </div>
          <p v-if="submitError" class="text-sm text-red-600">{{ submitError }}</p>
          <Button class="w-full" :disabled="isSubmitting" @click="onDeliver">Yetkazildi</Button>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
