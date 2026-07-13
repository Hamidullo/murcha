<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useQuery } from "@tanstack/vue-query";
import * as warehouseDocsApi from "../api/warehouse-docs.api.js";
import * as warehousesApi from "../api/warehouses.api.js";
import Button from "@/components/ui/button/Button.vue";

const router = useRouter();
const { t } = useI18n();

const TYPE_LABELS = {
  receipt: t("warehouseDocs.type.receipt"),
  issue: t("warehouseDocs.type.issue"),
  writeoff: t("warehouseDocs.type.writeoff"),
  transfer: t("warehouseDocs.type.transfer"),
};
const STATUS_LABELS = {
  draft: t("warehouseDocs.status.draft"),
  confirmed: t("warehouseDocs.status.confirmed"),
  cancelled: t("warehouseDocs.status.cancelled"),
};

const type = ref("");
const status = ref("");
const warehouseId = ref("");

const { data: warehousesData } = useQuery({
  queryKey: ["warehouses"],
  queryFn: warehousesApi.listWarehouses,
});
const warehouses = computed(() => warehousesData.value?.warehouses ?? []);

const {
  data: docsData,
  isLoading,
  isError,
} = useQuery({
  queryKey: computed(() => ["warehouse-docs", type.value, status.value, warehouseId.value]),
  queryFn: () =>
    warehouseDocsApi.listWarehouseDocs({
      type: type.value || undefined,
      status: status.value || undefined,
      warehouseId: warehouseId.value || undefined,
    }),
});
const docs = computed(() => docsData.value?.docs ?? []);

/**
 * @param {string} id
 * @returns {string}
 */
function warehouseName(id) {
  return warehouses.value.find((w) => w.id === id)?.name ?? "—";
}

/**
 * @param {string} docId
 * @returns {void}
 */
function goToDoc(docId) {
  router.push({ name: "warehouse-doc-edit", params: { id: docId } });
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">{{ t("warehouseDocs.title") }}</h1>
      <Button size="sm" @click="router.push({ name: 'warehouse-doc-new' })">
        {{ t("warehouseDocs.new") }}
      </Button>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <select
        v-model="type"
        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
      >
        <option value="">{{ t("warehouseDocs.allTypes") }}</option>
        <option v-for="(label, value) in TYPE_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
      <select
        v-model="status"
        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
      >
        <option value="">{{ t("warehouseDocs.allStatuses") }}</option>
        <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
      <select
        v-model="warehouseId"
        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
      >
        <option value="">{{ t("warehouseDocs.allWarehouses") }}</option>
        <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
          {{ warehouse.name }}
        </option>
      </select>
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">
      {{ t("warehouseDocs.loading") }}
    </p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">
      {{ t("warehouseDocs.loadError") }}
    </p>
    <p v-else-if="docs.length === 0" class="mt-6 text-sm text-brand-brown/60">
      {{ t("warehouseDocs.notFound") }}
    </p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-brand-brown/10 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-brand-brown/10 text-brand-brown/60">
          <tr>
            <th class="px-4 py-3 font-medium">{{ t("warehouseDocs.columns.number") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("warehouseDocs.columns.type") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("warehouseDocs.columns.warehouse") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("warehouseDocs.columns.status") }}</th>
            <th class="px-4 py-3 font-medium">{{ t("warehouseDocs.columns.total") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="doc in docs"
            :key="doc.id"
            class="cursor-pointer border-b border-brand-brown/5 last:border-0 hover:bg-brand-cream"
            @click="goToDoc(doc.id)"
          >
            <td class="px-4 py-3 text-brand-brown">{{ doc.number }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ TYPE_LABELS[doc.type] }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ warehouseName(doc.warehouseId) }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ STATUS_LABELS[doc.status] }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ doc.total }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
