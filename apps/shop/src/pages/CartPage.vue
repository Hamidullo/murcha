<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useCartStore } from "../stores/cart.store.js";
import * as ordersApi from "../api/orders.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import { Card, CardContent } from "@/components/ui/card";

const router = useRouter();
const cartStore = useCartStore();

const isSubmitting = ref(false);
const submitError = ref("");
const confirmedOrder = ref(null);

/**
 * @param {string} productId
 * @param {number} qty
 * @returns {void}
 */
function onQtyChange(productId, qty) {
  const value = Number(qty);
  if (value <= 0) {
    cartStore.removeItem(productId);
  } else {
    cartStore.updateQty(productId, value);
  }
}

/** @returns {Promise<void>} */
async function onCheckout() {
  submitError.value = "";
  isSubmitting.value = true;
  try {
    const order = await ordersApi.createOrder({
      warehouseId: cartStore.warehouseId,
      idempotencyKey: crypto.randomUUID(),
      items: cartStore.items.map((item) => ({
        productId: item.productId,
        unitId: item.unitId,
        qty: item.qty,
      })),
    });
    confirmedOrder.value = order;
    cartStore.clear();
  } catch (err) {
    submitError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSubmitting.value = false;
  }
}

/** @returns {void} */
function onContinueShopping() {
  confirmedOrder.value = null;
  router.push({ name: "home" });
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <template v-if="confirmedOrder">
      <Card>
        <CardContent class="flex flex-col items-center gap-3 p-6 text-center">
          <p class="text-lg font-semibold text-brand-brown">Zakaz qabul qilindi!</p>
          <p class="text-sm text-brand-brown/60">№ {{ confirmedOrder.number }}</p>
          <router-link
            :to="{ name: 'order-detail', params: { id: confirmedOrder.id } }"
            class="w-full"
          >
            <Button variant="outline" class="w-full">Zakazni ko'rish</Button>
          </router-link>
          <Button class="w-full" @click="onContinueShopping">Katalogga qaytish</Button>
        </CardContent>
      </Card>
    </template>

    <template v-else-if="cartStore.items.length === 0">
      <p class="text-sm text-brand-brown/60">Savat bo'sh</p>
    </template>

    <template v-else>
      <div class="flex flex-col gap-3">
        <Card v-for="item in cartStore.items" :key="item.productId">
          <CardContent class="flex items-center justify-between gap-3 p-4">
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-brand-brown">{{ item.nameUz }}</p>
              <p class="text-sm text-brand-brown/60">
                {{ item.price.toLocaleString("uz-UZ") }} × {{ item.qty }}
              </p>
            </div>
            <Input
              type="number"
              class="w-16 text-center"
              :model-value="item.qty"
              @update:model-value="onQtyChange(item.productId, $event)"
            />
          </CardContent>
        </Card>
      </div>

      <div class="mt-4 flex items-center justify-between text-brand-brown">
        <span class="font-medium">Jami</span>
        <span class="font-semibold">{{ cartStore.subtotal.toLocaleString("uz-UZ") }} UZS</span>
      </div>

      <p v-if="submitError" class="mt-2 text-sm text-red-600">{{ submitError }}</p>

      <Button class="mt-4 w-full" :disabled="isSubmitting" @click="onCheckout">
        {{ isSubmitting ? "Yuborilmoqda…" : "Buyurtma berish" }}
      </Button>
    </template>
  </div>
</template>
