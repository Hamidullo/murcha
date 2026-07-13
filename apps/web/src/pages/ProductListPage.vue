<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import * as productsApi from "../api/products.api.js";
import * as categoriesApi from "../api/categories.api.js";
import * as exportsApi from "../api/exports.api.js";
import * as importsApi from "../api/imports.api.js";
import { ApiError } from "../api/client.js";
import Input from "@/components/ui/input/Input.vue";
import Button from "@/components/ui/button/Button.vue";

const router = useRouter();
const queryClient = useQueryClient();
const { t } = useI18n();

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

/**
 * @param {string} productId
 * @returns {void}
 */
function goToEdit(productId) {
  router.push({ name: "product-edit", params: { id: productId } });
}

// --- Excel export/import ---
const isExporting = ref(false);
const importState = ref(""); // "" | "uploading" | "processing" | "done" | "error"
const importResult = ref(null);
const importError = ref("");
const fileInputRef = ref(null);

/** @returns {Promise<void>} */
async function onExport() {
  isExporting.value = true;
  try {
    await exportsApi.downloadExport("products", "mahsulotlar.xlsx");
  } catch (err) {
    importState.value = "error";
    importError.value = err instanceof ApiError ? err.message : t("products.downloadFailed");
  } finally {
    isExporting.value = false;
  }
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function onImportFileSelected(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  importError.value = "";
  importResult.value = null;
  importState.value = "uploading";
  try {
    const { jobId } = await importsApi.uploadImport("products", file);
    importState.value = "processing";
    await pollImportStatus(jobId);
  } catch (err) {
    importState.value = "error";
    importError.value = err instanceof ApiError ? err.message : t("products.downloadFailed");
  }
}

/**
 * @param {string} jobId
 * @returns {Promise<void>}
 */
async function pollImportStatus(jobId) {
  const status = await importsApi.getImportStatus(jobId);
  if (status.state === "completed") {
    importState.value = "done";
    importResult.value = status.result;
    queryClient.invalidateQueries({ queryKey: ["products"] });
    return;
  }
  if (status.state === "failed") {
    importState.value = "error";
    importError.value = status.failedReason ?? t("products.importFailed");
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await pollImportStatus(jobId);
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">{{ t("products.title") }}</h1>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="isExporting" @click="onExport">
          {{ isExporting ? t("products.exporting") : t("products.export") }}
        </Button>
        <Button variant="outline" size="sm" @click="fileInputRef?.click()">
          {{ t("products.import") }}
        </Button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx"
          class="hidden"
          @change="onImportFileSelected"
        />
        <Button size="sm" @click="router.push({ name: 'product-new' })">
          {{ t("products.new") }}
        </Button>
      </div>
    </div>

    <p v-if="importState === 'uploading'" class="mt-2 text-sm text-brand-brown/60">
      {{ t("products.importUploading") }}
    </p>
    <p v-else-if="importState === 'processing'" class="mt-2 text-sm text-brand-brown/60">
      {{ t("products.importProcessing") }}
    </p>
    <p v-else-if="importState === 'done'" class="mt-2 text-sm text-brand-brown">
      {{
        t("products.importDone", { succeeded: importResult.succeeded, total: importResult.total })
      }}
      <span v-if="importResult.failed > 0" class="text-red-600">
        {{ t("products.importFailedCount", { count: importResult.failed }) }}
      </span>
    </p>
    <p v-else-if="importState === 'error'" class="mt-2 text-sm text-red-600">
      {{ importError }}
    </p>

    <div class="mt-4 flex flex-wrap gap-3">
      <Input
        v-model="search"
        :placeholder="t('products.searchPlaceholder')"
        class="max-w-xs"
        @input="onSearchInput"
      />
      <select
        v-model="categoryId"
        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
      >
        <option value="">{{ t("products.allCategories") }}</option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.nameUz }}
        </option>
      </select>
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">{{ t("products.loading") }}</p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">{{ t("products.loadError") }}</p>
    <p v-else-if="products.length === 0" class="mt-6 text-sm text-brand-brown/60">
      {{ t("products.notFound") }}
    </p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-brand-brown/10 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-brand-brown/10 text-brand-brown/60">
          <tr>
            <th class="px-4 py-3 font-medium">{{ t("products.columns.name") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("products.columns.sku") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("products.columns.category") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("products.columns.unit") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("products.columns.status") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="product in products"
            :key="product.id"
            class="cursor-pointer border-b border-brand-brown/5 last:border-0 hover:bg-brand-cream"
            @click="goToEdit(product.id)"
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
