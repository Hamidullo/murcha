<script setup>
import { ref, reactive, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { createProductSchema, updateProductSchema } from "@murcha/shared";
import * as productsApi from "../api/products.api.js";
import * as categoriesApi from "../api/categories.api.js";
import * as unitsApi from "../api/units.api.js";
import * as priceTypesApi from "../api/priceTypes.api.js";
import { ApiError } from "../api/client.js";
import { printBarcodeLabel } from "../lib/print-barcode.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const { t } = useI18n();

const productId = computed(() => route.params.id ?? null);
const isEdit = computed(() => Boolean(productId.value));

const OPTIONAL_FIELDS = ["nameRu", "categoryId", "brand", "country", "description"];

const form = reactive({
  sku: "",
  nameUz: "",
  nameRu: "",
  categoryId: "",
  baseUnitId: "",
  brand: "",
  country: "",
  description: "",
});
const fieldErrors = ref({});
const formError = ref("");
const isSubmitting = ref(false);

const { data: categoriesData } = useQuery({
  queryKey: ["categories"],
  queryFn: categoriesApi.listCategories,
});
const categories = computed(() => categoriesData.value?.categories ?? []);

const { data: unitsData } = useQuery({ queryKey: ["units"], queryFn: unitsApi.listUnits });
const units = computed(() => unitsData.value?.units ?? []);

const { data: productData } = useQuery({
  queryKey: computed(() => ["product", productId.value]),
  queryFn: () => productsApi.getProduct(productId.value),
  enabled: isEdit,
});

watch(
  productData,
  (product) => {
    if (!product) return;
    form.sku = product.sku;
    form.nameUz = product.nameUz;
    form.nameRu = product.nameRu ?? "";
    form.categoryId = product.categoryId ?? "";
    form.baseUnitId = product.baseUnitId;
    form.brand = product.brand ?? "";
    form.country = product.country ?? "";
    form.description = product.description ?? "";
  },
  { immediate: true },
);

/** @returns {Promise<void>} */
async function onSubmit() {
  formError.value = "";
  fieldErrors.value = {};

  const dto = { ...form };
  for (const key of OPTIONAL_FIELDS) {
    if (!dto[key]) delete dto[key];
  }
  const schema = isEdit.value ? updateProductSchema : createProductSchema;
  const parsed = schema.safeParse(dto);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fieldErrors.value[issue.path[0]] = issue.message;
    }
    return;
  }

  isSubmitting.value = true;
  try {
    if (isEdit.value) {
      await productsApi.updateProduct(productId.value, parsed.data);
      queryClient.invalidateQueries({ queryKey: ["product", productId.value] });
    } else {
      const created = await productsApi.createProduct(parsed.data);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.replace({ name: "product-edit", params: { id: created.id } });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t("productForm.unexpectedError");
  } finally {
    isSubmitting.value = false;
  }
}

/** @returns {Promise<void>} */
async function onArchive() {
  if (!confirm(t("productForm.archiveConfirm"))) return;
  await productsApi.archiveProduct(productId.value);
  queryClient.invalidateQueries({ queryKey: ["products"] });
  router.push({ name: "products" });
}

// --- Narxlar ---
const { data: priceTypesData } = useQuery({
  queryKey: ["price-types"],
  queryFn: priceTypesApi.listPriceTypes,
  enabled: isEdit,
});
const priceTypes = computed(() => priceTypesData.value?.priceTypes ?? []);

const { data: pricesData, refetch: refetchPrices } = useQuery({
  queryKey: computed(() => ["prices", productId.value]),
  queryFn: () => productsApi.listCurrentPrices(productId.value),
  enabled: isEdit,
});
const prices = computed(() => pricesData.value?.prices ?? []);

const newPrice = reactive({ priceTypeId: "", price: "", currency: "UZS" });
const priceError = ref("");

/** @returns {Promise<void>} */
async function onAddPrice() {
  priceError.value = "";
  if (!newPrice.priceTypeId || !newPrice.price) return;
  try {
    await productsApi.addPrice(productId.value, {
      priceTypeId: newPrice.priceTypeId,
      price: Number(newPrice.price),
      currency: newPrice.currency,
    });
    newPrice.priceTypeId = "";
    newPrice.price = "";
    refetchPrices();
  } catch (err) {
    priceError.value = err instanceof ApiError ? err.message : t("productForm.genericError");
  }
}

/**
 * @param {string} priceTypeId
 * @returns {string}
 */
function priceTypeName(priceTypeId) {
  return priceTypes.value.find((pt) => pt.id === priceTypeId)?.name ?? priceTypeId;
}

// --- Variantlar ---
const { data: variantsData, refetch: refetchVariants } = useQuery({
  queryKey: computed(() => ["variants", productId.value]),
  queryFn: () => productsApi.listVariants(productId.value),
  enabled: isEdit,
});
const variants = computed(() => variantsData.value?.variants ?? []);
const newVariantName = ref("");

/** @returns {Promise<void>} */
async function onAddVariant() {
  if (!newVariantName.value.trim()) return;
  await productsApi.addVariant(productId.value, { name: newVariantName.value.trim() });
  newVariantName.value = "";
  refetchVariants();
}

/** @returns {Promise<void>} */
async function onArchiveVariant(variantId) {
  await productsApi.archiveVariant(productId.value, variantId);
  refetchVariants();
}

// --- Rasmlar ---
const { data: imagesData, refetch: refetchImages } = useQuery({
  queryKey: computed(() => ["images", productId.value]),
  queryFn: () => productsApi.listImages(productId.value),
  enabled: isEdit,
});
const images = computed(() => imagesData.value?.images ?? []);
const imageUrls = ref({});
const imageError = ref("");

watch(images, async (list) => {
  for (const image of list) {
    if (!imageUrls.value[image.id]) {
      try {
        const { url } = await productsApi.getImageUrl(productId.value, image.id);
        imageUrls.value = { ...imageUrls.value, [image.id]: url };
      } catch {
        // MinIO mahalliy mavjud bo'lmasligi mumkin — rasm ko'rinmaydi, xato emas.
      }
    }
  }
});

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function onFileSelected(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  imageError.value = "";
  try {
    await productsApi.uploadImage(productId.value, file);
    refetchImages();
  } catch (err) {
    imageError.value = err instanceof ApiError ? err.message : t("productForm.genericError");
  }
}

/** @returns {Promise<void>} */
async function onSetMainImage(imageId) {
  await productsApi.setMainImage(productId.value, imageId);
  refetchImages();
}

/** @returns {Promise<void>} */
async function onDeleteImage(imageId) {
  await productsApi.deleteImage(productId.value, imageId);
  refetchImages();
}

// --- Shtrix-kodlar ---
const { data: barcodesData, refetch: refetchBarcodes } = useQuery({
  queryKey: computed(() => ["barcodes", productId.value]),
  queryFn: () => productsApi.listBarcodes(productId.value),
  enabled: isEdit,
});
const barcodes = computed(() => barcodesData.value?.barcodes ?? []);
const newBarcode = ref("");
const barcodeError = ref("");

/** @returns {Promise<void>} */
async function onAddBarcode() {
  barcodeError.value = "";
  if (!newBarcode.value.trim()) return;
  try {
    await productsApi.addBarcode(productId.value, { barcode: newBarcode.value.trim() });
    newBarcode.value = "";
    refetchBarcodes();
  } catch (err) {
    barcodeError.value = err instanceof ApiError ? err.message : t("productForm.genericError");
  }
}

/**
 * @param {string} barcodeId
 * @returns {Promise<void>}
 */
async function onRemoveBarcode(barcodeId) {
  await productsApi.removeBarcode(productId.value, barcodeId);
  refetchBarcodes();
}

/**
 * @param {string} barcodeValue
 * @returns {void}
 */
function onPrintBarcode(barcodeValue) {
  printBarcodeLabel(barcodeValue, form.nameUz);
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">
        {{ isEdit ? t("productForm.editTitle") : t("productForm.newTitle") }}
      </h1>
      <Button v-if="isEdit" variant="outline" size="sm" @click="onArchive">
        {{ t("productForm.archive") }}
      </Button>
    </div>

    <Card class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("productForm.mainInfo") }}</CardTitle></CardHeader
      >
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <Label for="sku">{{ t("productForm.fields.sku") }}</Label>
              <Input id="sku" v-model="form.sku" />
              <p v-if="fieldErrors.sku" class="text-xs text-red-600">{{ fieldErrors.sku }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="nameUz">{{ t("productForm.fields.name") }}</Label>
              <Input id="nameUz" v-model="form.nameUz" />
              <p v-if="fieldErrors.nameUz" class="text-xs text-red-600">
                {{ fieldErrors.nameUz }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <Label for="categoryId">{{ t("productForm.fields.category") }}</Label>
              <select
                id="categoryId"
                v-model="form.categoryId"
                class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
              >
                <option value="">{{ t("productForm.fields.notSelected") }}</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.nameUz }}
                </option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="baseUnitId">{{ t("productForm.fields.baseUnit") }}</Label>
              <select
                id="baseUnitId"
                v-model="form.baseUnitId"
                class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
              >
                <option value="">{{ t("productForm.fields.selectPlaceholder") }}</option>
                <option v-for="unit in units" :key="unit.id" :value="unit.id">
                  {{ unit.name }}
                </option>
              </select>
              <p v-if="fieldErrors.baseUnitId" class="text-xs text-red-600">
                {{ fieldErrors.baseUnitId }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <Label for="brand">{{ t("productForm.fields.brand") }}</Label>
              <Input id="brand" v-model="form.brand" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="country">{{ t("productForm.fields.country") }}</Label>
              <Input id="country" v-model="form.country" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="description">{{ t("productForm.fields.description") }}</Label>
            <Input id="description" v-model="form.description" />
          </div>

          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <Button type="submit" :disabled="isSubmitting" class="w-full">
            {{ isSubmitting ? t("productForm.saving") : t("productForm.save") }}
          </Button>
        </form>
      </CardContent>
    </Card>

    <template v-if="isEdit">
      <Card class="mt-4">
        <CardHeader
          ><CardTitle>{{ t("productForm.prices.title") }}</CardTitle></CardHeader
        >
        <CardContent class="flex flex-col gap-3">
          <ul class="flex flex-col gap-1 text-sm text-brand-brown">
            <li v-for="price in prices" :key="price.id">
              {{ priceTypeName(price.priceTypeId) }}: {{ price.price }} {{ price.currency }}
            </li>
            <li v-if="prices.length === 0" class="text-brand-brown/60">
              {{ t("productForm.prices.empty") }}
            </li>
          </ul>
          <div class="flex flex-wrap items-end gap-2">
            <select
              v-model="newPrice.priceTypeId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="">{{ t("productForm.prices.typePlaceholder") }}</option>
              <option v-for="pt in priceTypes" :key="pt.id" :value="pt.id">{{ pt.name }}</option>
            </select>
            <Input
              v-model="newPrice.price"
              type="number"
              :placeholder="t('productForm.prices.pricePlaceholder')"
              class="w-28"
            />
            <select
              v-model="newPrice.currency"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
            </select>
            <Button type="button" size="sm" @click="onAddPrice">
              {{ t("productForm.prices.add") }}
            </Button>
          </div>
          <p v-if="priceError" class="text-xs text-red-600">{{ priceError }}</p>
        </CardContent>
      </Card>

      <Card class="mt-4">
        <CardHeader
          ><CardTitle>{{ t("productForm.variants.title") }}</CardTitle></CardHeader
        >
        <CardContent class="flex flex-col gap-3">
          <ul class="flex flex-col gap-1 text-sm text-brand-brown">
            <li
              v-for="variant in variants"
              :key="variant.id"
              class="flex items-center justify-between"
            >
              <span>{{ variant.name }}</span>
              <button
                type="button"
                class="text-xs text-red-600"
                @click="onArchiveVariant(variant.id)"
              >
                {{ t("productForm.variants.remove") }}
              </button>
            </li>
            <li v-if="variants.length === 0" class="text-brand-brown/60">
              {{ t("productForm.variants.empty") }}
            </li>
          </ul>
          <div class="flex gap-2">
            <Input
              v-model="newVariantName"
              :placeholder="t('productForm.variants.namePlaceholder')"
            />
            <Button type="button" size="sm" @click="onAddVariant">
              {{ t("productForm.variants.add") }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card class="mt-4">
        <CardHeader
          ><CardTitle>{{ t("productForm.images.title") }}</CardTitle></CardHeader
        >
        <CardContent class="flex flex-col gap-3">
          <div class="flex flex-wrap gap-3">
            <div v-for="image in images" :key="image.id" class="flex flex-col items-center gap-1">
              <img
                v-if="imageUrls[image.id]"
                :src="imageUrls[image.id]"
                alt=""
                class="h-20 w-20 rounded-md border border-brand-brown/10 object-cover"
              />
              <div
                v-else
                class="flex h-20 w-20 items-center justify-center rounded-md border border-brand-brown/10 text-xs text-brand-brown/40"
              >
                …
              </div>
              <div class="flex gap-1 text-xs">
                <button
                  type="button"
                  :class="image.isMain ? 'text-brand-amber' : 'text-brand-brown/50'"
                  @click="onSetMainImage(image.id)"
                >
                  {{
                    image.isMain ? t("productForm.images.main") : t("productForm.images.makeMain")
                  }}
                </button>
                <button type="button" class="text-red-600" @click="onDeleteImage(image.id)">
                  {{ t("productForm.images.remove") }}
                </button>
              </div>
            </div>
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" @change="onFileSelected" />
          <p v-if="imageError" class="text-xs text-red-600">{{ imageError }}</p>
        </CardContent>
      </Card>

      <Card class="mt-4">
        <CardHeader
          ><CardTitle>{{ t("productForm.barcodes.title") }}</CardTitle></CardHeader
        >
        <CardContent class="flex flex-col gap-3">
          <ul class="flex flex-col gap-1 text-sm text-brand-brown">
            <li
              v-for="barcode in barcodes"
              :key="barcode.id"
              class="flex items-center justify-between"
            >
              <span>{{ barcode.barcode }}</span>
              <span class="flex gap-2 text-xs">
                <button
                  type="button"
                  class="text-brand-amber"
                  @click="onPrintBarcode(barcode.barcode)"
                >
                  {{ t("productForm.barcodes.print") }}
                </button>
                <button type="button" class="text-red-600" @click="onRemoveBarcode(barcode.id)">
                  {{ t("productForm.barcodes.remove") }}
                </button>
              </span>
            </li>
            <li v-if="barcodes.length === 0" class="text-brand-brown/60">
              {{ t("productForm.barcodes.empty") }}
            </li>
          </ul>
          <div class="flex gap-2">
            <Input v-model="newBarcode" :placeholder="t('productForm.barcodes.placeholder')" />
            <Button type="button" size="sm" @click="onAddBarcode">
              {{ t("productForm.barcodes.add") }}
            </Button>
          </div>
          <p v-if="barcodeError" class="text-xs text-red-600">{{ barcodeError }}</p>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
