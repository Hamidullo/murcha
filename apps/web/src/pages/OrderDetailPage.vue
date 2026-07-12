<script setup>
import { ref, reactive, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import * as ordersApi from "../api/orders.api.js";
import * as productsApi from "../api/products.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const STATUS_LABELS = {
  new: "Yangi",
  confirmed: "Tasdiqlangan",
  picking: "Yig'ilmoqda",
  shipped: "Yo'lda",
  delivered: "Yetkazildi",
  accepted: "Qabul qilindi",
  cancelled: "Bekor qilindi",
};

const route = useRoute();
const queryClient = useQueryClient();
const orderId = computed(() => route.params.id);

const {
  data: order,
  isLoading,
  isError,
  refetch: refetchOrder,
} = useQuery({
  queryKey: computed(() => ["order", orderId.value]),
  queryFn: () => ordersApi.getOrder(orderId.value),
});

const { data: productsData } = useQuery({
  queryKey: ["products"],
  queryFn: () => productsApi.listProducts(),
});
const products = computed(() => productsData.value?.products ?? []);

/**
 * @param {string} productId
 * @returns {string}
 */
function productName(productId) {
  return products.value.find((p) => p.id === productId)?.nameUz ?? productId;
}

const actionError = ref("");
const isActing = ref(false);

/**
 * @param {() => Promise<unknown>} action
 * @returns {Promise<void>}
 */
async function runAction(action) {
  actionError.value = "";
  isActing.value = true;
  try {
    await action();
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    await refetchOrder();
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isActing.value = false;
  }
}

/** @returns {Promise<void>} */
function onConfirm() {
  return runAction(() => ordersApi.confirmOrder(orderId.value));
}

/** @returns {Promise<void>} */
function onPick() {
  return runAction(() => ordersApi.pickOrder(orderId.value));
}

/** @returns {Promise<void>} */
function onCancel() {
  if (!confirm("Zakazni bekor qilishni tasdiqlaysizmi?")) return;
  return runAction(() => ordersApi.cancelOrder(orderId.value));
}

// --- Jo'natish (pick list) — har item uchun jo'natilayotgan miqdor ---
const shipQuantities = reactive({});
watch(
  order,
  (value) => {
    if (!value) return;
    for (const item of value.items) {
      if (!(item.id in shipQuantities)) {
        shipQuantities[item.id] = Number(item.qtyOrdered);
      }
    }
  },
  { immediate: true },
);

/** @returns {Promise<void>} */
function onShip() {
  return runAction(() =>
    ordersApi.shipOrder(orderId.value, {
      items: order.value.items.map((item) => ({
        orderItemId: item.id,
        qty: Number(shipQuantities[item.id]),
      })),
    }),
  );
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <p v-if="isLoading" class="text-sm text-brand-brown/60">Yuklanmoqda…</p>
    <p v-else-if="isError" class="text-sm text-red-600">Zakazni yuklab bo'lmadi</p>

    <template v-else-if="order">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-brand-brown">№ {{ order.number }}</h1>
          <p class="text-sm text-brand-brown/60">{{ STATUS_LABELS[order.status] }}</p>
        </div>
        <div class="flex gap-2">
          <Button v-if="order.status === 'new'" :disabled="isActing" @click="onConfirm">
            Tasdiqlash
          </Button>
          <Button v-if="order.status === 'confirmed'" :disabled="isActing" @click="onPick">
            Yig'ishni boshlash
          </Button>
          <Button v-if="order.status === 'picking'" :disabled="isActing" @click="onShip">
            Jo'natish
          </Button>
          <Button
            v-if="['new', 'confirmed', 'picking'].includes(order.status)"
            variant="outline"
            :disabled="isActing"
            @click="onCancel"
          >
            Bekor qilish
          </Button>
        </div>
      </div>
      <p v-if="actionError" class="mt-2 text-sm text-red-600">{{ actionError }}</p>

      <Card class="mt-4">
        <CardHeader><CardTitle>Qatorlar (pick list)</CardTitle></CardHeader>
        <CardContent>
          <table class="w-full text-left text-sm">
            <thead class="border-b border-brand-brown/10 text-brand-brown/60">
              <tr>
                <th class="py-2 font-medium">Mahsulot</th>
                <th class="py-2 font-medium">Buyurtma</th>
                <th class="py-2 font-medium">Narx</th>
                <th v-if="order.status === 'picking'" class="py-2 font-medium">Jo'natiladi</th>
                <th v-else class="py-2 font-medium">Jo'natilgan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in order.items"
                :key="item.id"
                class="border-b border-brand-brown/5 last:border-0"
              >
                <td class="py-2 text-brand-brown">{{ productName(item.productId) }}</td>
                <td class="py-2 text-brand-brown/70">{{ Number(item.qtyOrdered) }}</td>
                <td class="py-2 text-brand-brown/70">{{ Number(item.price) }}</td>
                <td v-if="order.status === 'picking'" class="py-2">
                  <Input v-model="shipQuantities[item.id]" type="number" class="w-20" />
                </td>
                <td v-else class="py-2 text-brand-brown/70">{{ Number(item.qtyShipped) }}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div class="mt-4 flex items-center justify-between text-brand-brown">
        <span class="font-medium">Jami</span>
        <span class="font-semibold"> {{ Number(order.total) }} {{ order.currency }} </span>
      </div>
    </template>
  </div>
</template>
