<script setup>
import { ref, reactive, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { createWarehouseDocSchema, createWarehouseDocItemSchema } from "@murcha/shared";
import * as warehouseDocsApi from "../api/warehouse-docs.api.js";
import * as warehousesApi from "../api/warehouses.api.js";
import * as productsApi from "../api/products.api.js";
import * as unitsApi from "../api/units.api.js";
import { ApiError } from "../api/client.js";
import { enqueueWarehouseDocAction } from "../lib/offline-outbox.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const { t } = useI18n();

const TYPE_LABELS = {
  receipt: t("warehouseDocForm.type.receipt"),
  issue: t("warehouseDocForm.type.issue"),
  writeoff: t("warehouseDocForm.type.writeoff"),
  transfer: t("warehouseDocForm.type.transfer"),
};
const STATUS_LABELS = {
  draft: t("warehouseDocForm.status.draft"),
  confirmed: t("warehouseDocForm.status.confirmed"),
  cancelled: t("warehouseDocForm.status.cancelled"),
};

const docId = computed(() => route.params.id ?? null);
const isEdit = computed(() => Boolean(docId.value));

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

const { data: unitsData } = useQuery({ queryKey: ["units"], queryFn: unitsApi.listUnits });
const units = computed(() => unitsData.value?.units ?? []);

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
function unitShort(id) {
  return units.value.find((u) => u.id === id)?.short ?? id;
}

// --- Qoralama yaratish (create mode) ---
const createForm = reactive({ type: "receipt", warehouseId: "", toWarehouseId: "" });
const createFieldErrors = ref({});
const createError = ref("");
const isCreating = ref(false);

/** @returns {Promise<void>} */
async function onCreate() {
  createError.value = "";
  createFieldErrors.value = {};

  const dto = { type: createForm.type, warehouseId: createForm.warehouseId };
  if (createForm.type === "transfer") {
    dto.toWarehouseId = createForm.toWarehouseId;
  }
  const parsed = createWarehouseDocSchema.safeParse(dto);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      createFieldErrors.value[issue.path[0]] = issue.message;
    }
    return;
  }

  isCreating.value = true;
  try {
    const doc = await warehouseDocsApi.createWarehouseDoc(parsed.data);
    queryClient.invalidateQueries({ queryKey: ["warehouse-docs"] });
    router.replace({ name: "warehouse-doc-edit", params: { id: doc.id } });
  } catch (err) {
    createError.value =
      err instanceof ApiError ? err.message : t("warehouseDocForm.unexpectedError");
  } finally {
    isCreating.value = false;
  }
}

// --- Mavjud hujjat (edit mode) ---
const {
  data: doc,
  isLoading: isDocLoading,
  isError: isDocError,
  refetch: refetchDoc,
} = useQuery({
  queryKey: computed(() => ["warehouse-doc", docId.value]),
  queryFn: () => warehouseDocsApi.getWarehouseDoc(docId.value),
  enabled: isEdit,
});

const isDraft = computed(() => doc.value?.status === "draft");
const isConfirmed = computed(() => doc.value?.status === "confirmed");

const newItem = reactive({ productId: "", unitId: "", qty: "", price: "" });
const itemError = ref("");

/** @returns {Promise<void>} */
async function onAddItem() {
  itemError.value = "";
  const dto = {
    productId: newItem.productId,
    unitId: newItem.unitId,
    qty: Number(newItem.qty),
  };
  if (newItem.price) dto.price = Number(newItem.price);

  const parsed = createWarehouseDocItemSchema.safeParse(dto);
  if (!parsed.success) {
    itemError.value = parsed.error.issues[0]?.message ?? t("warehouseDocForm.invalidRow");
    return;
  }

  try {
    await warehouseDocsApi.addWarehouseDocItem(docId.value, parsed.data);
    newItem.productId = "";
    newItem.unitId = "";
    newItem.qty = "";
    newItem.price = "";
    refetchDoc();
  } catch (err) {
    itemError.value = err instanceof ApiError ? err.message : t("warehouseDocForm.genericError");
  }
}

/**
 * @param {string} itemId
 * @returns {Promise<void>}
 */
async function onRemoveItem(itemId) {
  await warehouseDocsApi.removeWarehouseDocItem(docId.value, itemId);
  refetchDoc();
}

const actionError = ref("");
const actionQueued = ref(false);

/**
 * @param {"confirm" | "cancel"} action
 * @returns {Promise<void>}
 */
async function runDocAction(action) {
  actionError.value = "";
  actionQueued.value = false;
  try {
    if (!navigator.onLine) throw new TypeError("offline");
    if (action === "confirm") {
      await warehouseDocsApi.confirmWarehouseDoc(docId.value);
    } else {
      await warehouseDocsApi.cancelWarehouseDoc(docId.value);
    }
    queryClient.invalidateQueries({ queryKey: ["warehouse-docs"] });
    refetchDoc();
  } catch (err) {
    if (err instanceof ApiError) {
      actionError.value = err.message;
    } else {
      // Tarmoq xatosi (yoki offline) — navbatga qo'yiladi, AppLayout aloqa
      // tiklanganda avtomatik yuboradi (holat-himoyasi tufayli xavfsiz
      // qayta urinish — lib/offline-outbox.js).
      try {
        await enqueueWarehouseDocAction(docId.value, action);
        actionQueued.value = true;
      } catch {
        actionError.value = t("warehouseDocForm.unexpectedError");
      }
    }
  }
}

/** @returns {Promise<void>} */
function onConfirm() {
  if (!confirm(t("warehouseDocForm.confirmDoc"))) return Promise.resolve();
  return runDocAction("confirm");
}

/** @returns {Promise<void>} */
function onCancel() {
  if (!confirm(t("warehouseDocForm.cancelDoc"))) return Promise.resolve();
  return runDocAction("cancel");
}

/** @returns {Promise<void>} */
function onPrintAct() {
  return warehouseDocsApi.downloadActPdf(docId.value, doc.value.number);
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <template v-if="!isEdit">
      <h1 class="text-2xl font-semibold text-brand-brown">{{ t("warehouseDocForm.newTitle") }}</h1>
      <Card class="mt-4">
        <CardContent>
          <form class="flex flex-col gap-4" @submit.prevent="onCreate">
            <div class="flex flex-col gap-1.5">
              <Label for="type">{{ t("warehouseDocForm.fields.type") }}</Label>
              <select
                id="type"
                v-model="createForm.type"
                class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
              >
                <option v-for="(label, value) in TYPE_LABELS" :key="value" :value="value">
                  {{ label }}
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label for="warehouseId">
                {{
                  createForm.type === "transfer"
                    ? t("warehouseDocForm.fields.warehouseFrom")
                    : t("warehouseDocForm.fields.warehouse")
                }}
              </Label>
              <select
                id="warehouseId"
                v-model="createForm.warehouseId"
                class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
              >
                <option value="">{{ t("warehouseDocForm.fields.selectPlaceholder") }}</option>
                <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                  {{ warehouse.name }}
                </option>
              </select>
              <p v-if="createFieldErrors.warehouseId" class="text-xs text-red-600">
                {{ createFieldErrors.warehouseId }}
              </p>
            </div>

            <div v-if="createForm.type === 'transfer'" class="flex flex-col gap-1.5">
              <Label for="toWarehouseId">{{ t("warehouseDocForm.fields.toWarehouse") }}</Label>
              <select
                id="toWarehouseId"
                v-model="createForm.toWarehouseId"
                class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
              >
                <option value="">{{ t("warehouseDocForm.fields.selectPlaceholder") }}</option>
                <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                  {{ warehouse.name }}
                </option>
              </select>
              <p v-if="createFieldErrors.toWarehouseId" class="text-xs text-red-600">
                {{ createFieldErrors.toWarehouseId }}
              </p>
            </div>

            <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>
            <Button type="submit" :disabled="isCreating" class="w-full">
              {{ isCreating ? t("warehouseDocForm.creating") : t("warehouseDocForm.createDraft") }}
            </Button>
          </form>
        </CardContent>
      </Card>
    </template>

    <p v-else-if="isDocLoading" class="text-sm text-brand-brown/60">
      {{ t("warehouseDocForm.loading") }}
    </p>
    <p v-else-if="isDocError" class="text-sm text-red-600">
      {{ t("warehouseDocForm.loadError") }}
    </p>

    <template v-else-if="doc">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-brand-brown">{{ doc.number }}</h1>
          <p class="text-sm text-brand-brown/60">
            {{ TYPE_LABELS[doc.type] }} · {{ STATUS_LABELS[doc.status] }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button v-if="isDraft" size="sm" @click="onConfirm">
            {{ t("warehouseDocForm.confirm") }}
          </Button>
          <Button v-if="isConfirmed" variant="outline" size="sm" @click="onCancel">
            {{ t("warehouseDocForm.cancel") }}
          </Button>
          <Button v-if="isConfirmed" variant="outline" size="sm" @click="onPrintAct">
            {{ t("warehouseDocForm.print") }}
          </Button>
        </div>
      </div>
      <p v-if="actionError" class="mt-2 text-sm text-red-600">{{ actionError }}</p>
      <p v-if="actionQueued" class="mt-2 text-sm text-green-700">
        {{ t("warehouseDocForm.actionQueued") }}
      </p>

      <Card class="mt-4">
        <CardHeader
          ><CardTitle>{{ t("warehouseDocForm.rows.title") }}</CardTitle></CardHeader
        >
        <CardContent class="flex flex-col gap-3">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-brand-brown/10 text-brand-brown/60">
              <tr>
                <th class="py-2 font-medium">{{ t("warehouseDocForm.rows.product") }}</th>
                <th class="py-2 font-medium">{{ t("warehouseDocForm.rows.qty") }}</th>
                <th class="py-2 font-medium">{{ t("warehouseDocForm.rows.price") }}</th>
                <th class="py-2 font-medium">{{ t("warehouseDocForm.rows.total") }}</th>
                <th v-if="isDraft" class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in doc.items"
                :key="item.id"
                class="border-b border-brand-brown/5 last:border-0"
              >
                <td class="py-2 text-brand-brown">{{ productName(item.productId) }}</td>
                <td class="py-2 text-brand-brown/70">
                  {{ item.qty }} {{ unitShort(item.unitId) }}
                </td>
                <td class="py-2 text-brand-brown/70">{{ item.price ?? "—" }}</td>
                <td class="py-2 text-brand-brown/70">{{ item.total ?? "—" }}</td>
                <td v-if="isDraft" class="py-2">
                  <button type="button" class="text-xs text-red-600" @click="onRemoveItem(item.id)">
                    {{ t("warehouseDocForm.rows.remove") }}
                  </button>
                </td>
              </tr>
              <tr v-if="doc.items.length === 0">
                <td colspan="5" class="py-3 text-brand-brown/60">
                  {{ t("warehouseDocForm.rows.empty") }}
                </td>
              </tr>
            </tbody>
          </table>
          <p class="text-right text-sm font-medium text-brand-brown">
            {{ t("warehouseDocForm.totalLabel", { total: doc.total }) }}
          </p>

          <div
            v-if="isDraft"
            class="flex flex-wrap items-end gap-2 border-t border-brand-brown/10 pt-3"
          >
            <select
              v-model="newItem.productId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="">{{ t("warehouseDocForm.rows.product") }}</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.nameUz }}
              </option>
            </select>
            <select
              v-model="newItem.unitId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="">{{ t("warehouseDocForm.rows.unitPlaceholder") }}</option>
              <option v-for="unit in units" :key="unit.id" :value="unit.id">
                {{ unit.short }}
              </option>
            </select>
            <Input
              v-model="newItem.qty"
              type="number"
              :placeholder="t('warehouseDocForm.rows.qty')"
              class="w-24"
            />
            <Input
              v-model="newItem.price"
              type="number"
              :placeholder="t('warehouseDocForm.rows.price')"
              class="w-24"
            />
            <Button type="button" size="sm" @click="onAddItem">
              {{ t("warehouseDocForm.rows.add") }}
            </Button>
          </div>
          <p v-if="itemError" class="text-xs text-red-600">{{ itemError }}</p>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
