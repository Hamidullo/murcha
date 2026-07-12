<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import * as ordersApi from "../api/orders.api.js";
import * as shopCatalogApi from "../api/shop-catalog.api.js";
import { Card, CardContent } from "@/components/ui/card";

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
const orderId = computed(() => route.params.id);

const {
  data: order,
  isLoading,
  isError,
} = useQuery({
  queryKey: computed(() => ["order", orderId.value]),
  queryFn: () => ordersApi.getOrder(orderId.value),
});

// Mahsulot nomlarini ko'rsatish uchun — `Order.items` faqat `productId`ni
// saqlaydi (`warehouse_docs`dagi bilan bir xil konvensiya), nomi mavjud
// `shop-catalog`dan (do'kon operatorining o'zi ko'ra oladigan yagona
// mahsulot ro'yxati) qidirib topiladi.
const { data: catalogData } = useQuery({
  queryKey: ["shop-catalog"],
  queryFn: () => shopCatalogApi.listCatalog(),
});
const productNames = computed(() => {
  const map = new Map();
  for (const item of catalogData.value?.items ?? []) {
    map.set(item.productId, item.nameUz);
  }
  return map;
});

/**
 * @param {string} productId
 * @returns {string}
 */
function productName(productId) {
  return productNames.value.get(productId) ?? productId;
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <p v-if="isLoading" class="text-sm text-brand-brown/60">Yuklanmoqda…</p>
    <p v-else-if="isError" class="text-sm text-red-600">Zakazni yuklab bo'lmadi</p>

    <template v-else-if="order">
      <h1 class="text-lg font-semibold text-brand-brown">№ {{ order.number }}</h1>
      <p class="text-sm text-brand-brown/60">
        {{ STATUS_LABELS[order.status] ?? order.status }}
      </p>

      <div class="mt-4 flex flex-col gap-3">
        <Card v-for="item in order.items" :key="item.id">
          <CardContent class="flex items-center justify-between p-4">
            <div>
              <p class="font-medium text-brand-brown">{{ productName(item.productId) }}</p>
              <p class="text-sm text-brand-brown/60">
                {{ Number(item.price).toLocaleString("uz-UZ") }} × {{ Number(item.qtyOrdered) }}
              </p>
            </div>
            <p class="font-semibold text-brand-brown">
              {{ Number(item.total).toLocaleString("uz-UZ") }}
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="mt-4 flex items-center justify-between text-brand-brown">
        <span class="font-medium">Jami</span>
        <span class="font-semibold">
          {{ Number(order.total).toLocaleString("uz-UZ") }} {{ order.currency }}
        </span>
      </div>
    </template>
  </div>
</template>
