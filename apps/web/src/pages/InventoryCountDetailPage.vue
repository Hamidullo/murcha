<script setup>
import { reactive, computed, watch, ref } from "vue";
import { useRoute } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as inventoryCountsApi from "../api/inventory-counts.api.js";
import * as warehousesApi from "../api/warehouses.api.js";
import * as productsApi from "../api/products.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const STATUS_LABELS = computed(() => ({
  in_progress: t("inventoryCountDetail.status.in_progress"),
  review: t("inventoryCountDetail.status.review"),
  approved: t("inventoryCountDetail.status.approved"),
}));

const route = useRoute();
const queryClient = useQueryClient();
const countId = computed(() => route.params.id);

const {
  data: count,
  isLoading,
  isError,
  refetch: refetchCount,
} = useQuery({
  queryKey: computed(() => ["inventory-count", countId.value]),
  queryFn: () => inventoryCountsApi.getInventoryCount(countId.value),
});

const { data: warehousesData } = useQuery({
  queryKey: ["warehouses"],
  queryFn: warehousesApi.listWarehouses,
});
const warehouses = computed(() => warehousesData.value?.warehouses ?? []);

const { data: productsData } = useQuery({
  queryKey: ["products"],
  queryFn: () => productsApi.listProducts(),
});
const products = computed(() => productsData.value?.products ?? []);

/**
 * @param {string} id
 * @returns {string}
 */
function productName(id) {
  return products.value.find((p) => p.id === id)?.nameUz ?? id;
}

/**
 * @param {string} id
 * @returns {string}
 */
function warehouseName(id) {
  return warehouses.value.find((w) => w.id === id)?.name ?? "—";
}

const isDraftStatus = computed(() => count.value?.status === "in_progress");

// Har qator uchun mahalliy kiritma — server qiymati bilan boshlanadi, saqlanmaguncha bu yerda turadi.
const countedInputs = reactive({});
watch(
  count,
  (value) => {
    if (!value) return;
    for (const item of value.items) {
      if (!(item.id in countedInputs)) {
        countedInputs[item.id] = item.countedQty ?? "";
      }
    }
  },
  { immediate: true },
);

const itemErrors = reactive({});
const savingItemId = ref(null);

/**
 * @param {object} item
 * @returns {Promise<void>}
 */
async function onSaveCount(item) {
  itemErrors[item.id] = "";
  const value = countedInputs[item.id];
  if (value === "" || value == null) return;
  savingItemId.value = item.id;
  try {
    await inventoryCountsApi.submitCount(countId.value, item.id, { countedQty: Number(value) });
    refetchCount();
  } catch (err) {
    itemErrors[item.id] =
      err instanceof ApiError ? err.message : t("inventoryCountDetail.saveError");
  } finally {
    savingItemId.value = null;
  }
}

/**
 * @param {object} item
 * @returns {number | null}
 */
function livePreviewDiff(item) {
  const value = countedInputs[item.id];
  if (value === "" || value == null) return null;
  return Number(value) - Number(item.systemQty);
}

const allCounted = computed(
  () => count.value?.items.every((item) => item.countedQty != null) ?? false,
);

const approveError = ref("");
const isApproving = ref(false);

/** @returns {Promise<void>} */
async function onApprove() {
  if (!confirm(t("inventoryCountDetail.approveConfirm"))) {
    return;
  }
  approveError.value = "";
  isApproving.value = true;
  try {
    await inventoryCountsApi.approveInventoryCount(countId.value);
    queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
    refetchCount();
  } catch (err) {
    approveError.value =
      err instanceof ApiError ? err.message : t("inventoryCountDetail.unexpectedError");
  } finally {
    isApproving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <p v-if="isLoading" class="text-sm text-brand-brown/60">
      {{ t("inventoryCountDetail.loading") }}
    </p>
    <p v-else-if="isError" class="text-sm text-red-600">
      {{ t("inventoryCountDetail.loadError") }}
    </p>

    <template v-else-if="count">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-brand-brown">
            {{ warehouseName(count.warehouseId) }}
          </h1>
          <p class="text-sm text-brand-brown/60">{{ STATUS_LABELS[count.status] }}</p>
        </div>
        <Button v-if="isDraftStatus" :disabled="!allCounted || isApproving" @click="onApprove">
          {{
            isApproving ? t("inventoryCountDetail.approving") : t("inventoryCountDetail.approve")
          }}
        </Button>
      </div>
      <p v-if="isDraftStatus && !allCounted" class="mt-2 text-xs text-brand-brown/50">
        {{ t("inventoryCountDetail.approveHint") }}
      </p>
      <p v-if="approveError" class="mt-2 text-sm text-red-600">{{ approveError }}</p>

      <Card class="mt-4">
        <CardHeader
          ><CardTitle>{{ t("inventoryCountDetail.rowsCardTitle") }}</CardTitle></CardHeader
        >
        <CardContent>
          <table class="w-full text-left text-sm">
            <thead class="border-b border-brand-brown/10 text-brand-brown/60">
              <tr>
                <th class="py-2 font-medium">{{ t("inventoryCountDetail.table.product") }}</th>
                <th class="py-2 font-medium">{{ t("inventoryCountDetail.table.systemQty") }}</th>
                <th class="py-2 font-medium">{{ t("inventoryCountDetail.table.countedQty") }}</th>
                <th class="py-2 font-medium">{{ t("inventoryCountDetail.table.diff") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in count.items"
                :key="item.id"
                class="border-b border-brand-brown/5 last:border-0"
              >
                <td class="py-2 text-brand-brown">{{ productName(item.productId) }}</td>
                <td class="py-2 text-brand-brown/70">{{ item.systemQty }}</td>
                <td class="py-2">
                  <Input
                    v-model="countedInputs[item.id]"
                    type="number"
                    :disabled="!isDraftStatus"
                    class="w-24"
                    @change="onSaveCount(item)"
                  />
                  <span v-if="savingItemId === item.id" class="ml-1 text-xs text-brand-brown/50">
                    {{ t("inventoryCountDetail.saving") }}
                  </span>
                  <p v-if="itemErrors[item.id]" class="text-xs text-red-600">
                    {{ itemErrors[item.id] }}
                  </p>
                </td>
                <td
                  class="py-2"
                  :class="{
                    'text-red-600': (livePreviewDiff(item) ?? item.diff ?? 0) < 0,
                    'text-brand-amber': (livePreviewDiff(item) ?? item.diff ?? 0) > 0,
                    'text-brand-brown/70': (livePreviewDiff(item) ?? item.diff ?? 0) === 0,
                  }"
                >
                  {{ livePreviewDiff(item) ?? item.diff ?? "—" }}
                </td>
              </tr>
              <tr v-if="count.items.length === 0">
                <td colspan="4" class="py-3 text-brand-brown/60">
                  {{ t("inventoryCountDetail.noRows") }}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
