<script setup>
import { ref, reactive, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { createWarehouseDocSchema, createWarehouseDocItemSchema } from "@murcha/shared";
import * as warehouseDocsApi from "../api/warehouse-docs.api.js";
import * as warehousesApi from "../api/warehouses.api.js";
import * as productsApi from "../api/products.api.js";
import * as unitsApi from "../api/units.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const TYPE_LABELS = {
  receipt: "Kirim",
  issue: "Chiqim",
  writeoff: "Spisaniye",
  transfer: "Ko'chirish",
};
const STATUS_LABELS = {
  draft: "Qoralama",
  confirmed: "Tasdiqlangan",
  cancelled: "Bekor qilingan",
};

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();

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
    createError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
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
    itemError.value = parsed.error.issues[0]?.message ?? "Noto'g'ri qator";
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
    itemError.value = err instanceof ApiError ? err.message : "Xato yuz berdi";
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

/** @returns {Promise<void>} */
async function onConfirm() {
  if (!confirm("Hujjatni tasdiqlaysizmi? Skladdagi qoldiq shu zahoti yangilanadi.")) return;
  actionError.value = "";
  try {
    await warehouseDocsApi.confirmWarehouseDoc(docId.value);
    queryClient.invalidateQueries({ queryKey: ["warehouse-docs"] });
    refetchDoc();
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  }
}

/** @returns {Promise<void>} */
async function onCancel() {
  if (!confirm("Hujjatni bekor qilasizmi (storno)? Teskari harakat yoziladi.")) return;
  actionError.value = "";
  try {
    await warehouseDocsApi.cancelWarehouseDoc(docId.value);
    queryClient.invalidateQueries({ queryKey: ["warehouse-docs"] });
    refetchDoc();
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  }
}

/** @returns {Promise<void>} */
function onPrintAct() {
  return warehouseDocsApi.downloadActPdf(docId.value, doc.value.number);
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <template v-if="!isEdit">
      <h1 class="text-2xl font-semibold text-brand-brown">Yangi sklad hujjati</h1>
      <Card class="mt-4">
        <CardContent>
          <form class="flex flex-col gap-4" @submit.prevent="onCreate">
            <div class="flex flex-col gap-1.5">
              <Label for="type">Turi</Label>
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
                {{ createForm.type === "transfer" ? "Chiqish sklad" : "Sklad" }}
              </Label>
              <select
                id="warehouseId"
                v-model="createForm.warehouseId"
                class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
              >
                <option value="">Tanlang</option>
                <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                  {{ warehouse.name }}
                </option>
              </select>
              <p v-if="createFieldErrors.warehouseId" class="text-xs text-red-600">
                {{ createFieldErrors.warehouseId }}
              </p>
            </div>

            <div v-if="createForm.type === 'transfer'" class="flex flex-col gap-1.5">
              <Label for="toWarehouseId">Qabul qiluvchi sklad</Label>
              <select
                id="toWarehouseId"
                v-model="createForm.toWarehouseId"
                class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
              >
                <option value="">Tanlang</option>
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
              {{ isCreating ? "Yaratilmoqda…" : "Qoralama yaratish" }}
            </Button>
          </form>
        </CardContent>
      </Card>
    </template>

    <p v-else-if="isDocLoading" class="text-sm text-brand-brown/60">Yuklanmoqda…</p>
    <p v-else-if="isDocError" class="text-sm text-red-600">Hujjatni yuklab bo'lmadi</p>

    <template v-else-if="doc">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-brand-brown">{{ doc.number }}</h1>
          <p class="text-sm text-brand-brown/60">
            {{ TYPE_LABELS[doc.type] }} · {{ STATUS_LABELS[doc.status] }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button v-if="isDraft" size="sm" @click="onConfirm">Tasdiqlash</Button>
          <Button v-if="isConfirmed" variant="outline" size="sm" @click="onCancel">
            Bekor qilish
          </Button>
          <Button v-if="isConfirmed" variant="outline" size="sm" @click="onPrintAct">
            Chop etish
          </Button>
        </div>
      </div>
      <p v-if="actionError" class="mt-2 text-sm text-red-600">{{ actionError }}</p>

      <Card class="mt-4">
        <CardHeader><CardTitle>Qatorlar</CardTitle></CardHeader>
        <CardContent class="flex flex-col gap-3">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-brand-brown/10 text-brand-brown/60">
              <tr>
                <th class="py-2 font-medium">Mahsulot</th>
                <th class="py-2 font-medium">Miqdor</th>
                <th class="py-2 font-medium">Narx</th>
                <th class="py-2 font-medium">Jami</th>
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
                    O'chirish
                  </button>
                </td>
              </tr>
              <tr v-if="doc.items.length === 0">
                <td colspan="5" class="py-3 text-brand-brown/60">Qator yo'q</td>
              </tr>
            </tbody>
          </table>
          <p class="text-right text-sm font-medium text-brand-brown">Jami: {{ doc.total }}</p>

          <div
            v-if="isDraft"
            class="flex flex-wrap items-end gap-2 border-t border-brand-brown/10 pt-3"
          >
            <select
              v-model="newItem.productId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="">Mahsulot</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.nameUz }}
              </option>
            </select>
            <select
              v-model="newItem.unitId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="">Birlik</option>
              <option v-for="unit in units" :key="unit.id" :value="unit.id">
                {{ unit.short }}
              </option>
            </select>
            <Input v-model="newItem.qty" type="number" placeholder="Miqdor" class="w-24" />
            <Input v-model="newItem.price" type="number" placeholder="Narx" class="w-24" />
            <Button type="button" size="sm" @click="onAddItem">Qo'shish</Button>
          </div>
          <p v-if="itemError" class="text-xs text-red-600">{{ itemError }}</p>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
