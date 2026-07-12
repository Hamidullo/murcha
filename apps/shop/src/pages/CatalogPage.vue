<script setup>
import { ref, computed, onBeforeUnmount, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import * as shopCatalogApi from "../api/shop-catalog.api.js";
import * as warehousesApi from "../api/warehouses.api.js";
import { useCartStore } from "../stores/cart.store.js";
import Input from "@/components/ui/input/Input.vue";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardContent } from "@/components/ui/card";

const cartStore = useCartStore();

const search = ref("");
const debouncedSearch = ref("");
let debounceTimer;
function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = search.value.trim();
  }, 300);
}
onBeforeUnmount(() => clearTimeout(debounceTimer));

const { data: warehousesData } = useQuery({
  queryKey: ["warehouses"],
  queryFn: warehousesApi.listWarehouses,
});
const warehouses = computed(() => warehousesData.value?.warehouses ?? []);

const selectedWarehouseId = ref(cartStore.warehouseId ?? "");
watch(
  warehouses,
  (list) => {
    if (!selectedWarehouseId.value && list.length > 0) {
      selectedWarehouseId.value = list[0].id;
    }
  },
  { immediate: true },
);
watch(selectedWarehouseId, (id) => {
  if (id) cartStore.setWarehouse(id);
});

const {
  data: catalogData,
  isLoading,
  isError,
} = useQuery({
  queryKey: computed(() => ["shop-catalog", debouncedSearch.value, selectedWarehouseId.value]),
  queryFn: () =>
    shopCatalogApi.listCatalog({
      search: debouncedSearch.value || undefined,
      warehouseId: selectedWarehouseId.value || undefined,
    }),
  enabled: computed(() => Boolean(selectedWarehouseId.value)),
});
const items = computed(() => catalogData.value?.items ?? []);

const quantities = ref({});

/**
 * @param {object} product
 * @returns {void}
 */
function onAddToCart(product) {
  const qty = Number(quantities.value[product.productId] || 1);
  if (qty <= 0) return;
  cartStore.addItem(
    {
      productId: product.productId,
      unitId: product.baseUnitId,
      nameUz: product.nameUz,
      price: product.price,
    },
    qty,
  );
  quantities.value[product.productId] = 1;
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <div class="flex flex-col gap-3">
      <Input v-model="search" placeholder="Mahsulot qidirish…" @input="onSearchInput" />
      <select
        v-model="selectedWarehouseId"
        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
      >
        <option v-for="wh in warehouses" :key="wh.id" :value="wh.id">{{ wh.name }}</option>
      </select>
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">Yuklanmoqda…</p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">Katalogni yuklab bo'lmadi</p>
    <p v-else-if="items.length === 0" class="mt-6 text-sm text-brand-brown/60">
      Mahsulot topilmadi
    </p>

    <div class="mt-4 flex flex-col gap-3">
      <Card v-for="product in items" :key="product.productId">
        <CardContent class="flex items-center justify-between gap-3 p-4">
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-brand-brown">{{ product.nameUz }}</p>
            <p class="text-sm text-brand-brown/60">
              {{ product.price.toLocaleString("uz-UZ") }} {{ product.currency }}
              <span v-if="product.availableQty !== null" class="ml-2 text-xs">
                (qoldiq: {{ product.availableQty }})
              </span>
            </p>
          </div>
          <Input
            v-model="quantities[product.productId]"
            type="number"
            class="w-16 text-center"
            placeholder="1"
          />
          <Button size="sm" @click="onAddToCart(product)">Qo'shish</Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
