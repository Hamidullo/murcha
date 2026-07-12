<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import { useQuery } from "@tanstack/vue-query";
import * as productsApi from "../api/products.api.js";
import * as categoriesApi from "../api/categories.api.js";
import Input from "@/components/ui/input/Input.vue";

const search = ref("");
const debouncedSearch = ref("");
const categoryId = ref("");

let debounceTimer;
function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = search.value.trim();
  }, 300);
}
onBeforeUnmount(() => clearTimeout(debounceTimer));

const { data: categoriesData } = useQuery({
  queryKey: ["categories"],
  queryFn: categoriesApi.listCategories,
});
const categories = computed(() => categoriesData.value?.categories ?? []);

const {
  data: productsData,
  isLoading,
  isError,
} = useQuery({
  queryKey: computed(() => ["products", debouncedSearch.value, categoryId.value]),
  queryFn: () =>
    productsApi.listProducts({
      search: debouncedSearch.value || undefined,
      categoryId: categoryId.value || undefined,
    }),
});
const products = computed(() => productsData.value?.products ?? []);
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-brand-brown">Katalog</h1>

    <div class="mt-4 flex flex-wrap gap-3">
      <Input
        v-model="search"
        placeholder="Mahsulot nomi bo'yicha qidirish…"
        class="max-w-xs"
        @input="onSearchInput"
      />
      <select
        v-model="categoryId"
        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
      >
        <option value="">Barcha kategoriyalar</option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.nameUz }}
        </option>
      </select>
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">Yuklanmoqda…</p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">Mahsulotlarni yuklab bo'lmadi</p>
    <p v-else-if="products.length === 0" class="mt-6 text-sm text-brand-brown/60">
      Mahsulot topilmadi
    </p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-brand-brown/10 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-brand-brown/10 text-brand-brown/60">
          <tr>
            <th class="px-4 py-3 font-medium">Nomi</th>
            <th class="px-4 py-3 font-medium">SKU</th>
            <th class="px-4 py-3 font-medium">Kategoriya</th>
            <th class="px-4 py-3 font-medium">Birlik</th>
            <th class="px-4 py-3 font-medium">Holat</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="product in products"
            :key="product.id"
            class="border-b border-brand-brown/5 last:border-0"
          >
            <td class="px-4 py-3 text-brand-brown">{{ product.nameUz }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ product.sku }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ product.category?.nameUz ?? "—" }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ product.baseUnit?.short ?? "—" }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ product.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
