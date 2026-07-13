<script setup>
import { ref, watch } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";
import * as companiesApi from "../api/companies.api.js";
import * as exchangeRatesApi from "../api/exchange-rates.api.js";
import * as priceTypesApi from "../api/priceTypes.api.js";
import * as categoriesApi from "../api/categories.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const queryClient = useQueryClient();

const { data: company } = useQuery({
  queryKey: ["company-me"],
  queryFn: () => companiesApi.getMe(),
});
const { data: logo } = useQuery({
  queryKey: ["company-logo-url"],
  queryFn: () => companiesApi.getLogoUrl(),
});
const { data: currentRate } = useQuery({
  queryKey: ["exchange-rate-current"],
  queryFn: () => exchangeRatesApi.getCurrentRate("USD"),
  retry: false,
});
const { data: priceTypesData } = useQuery({
  queryKey: ["price-types"],
  queryFn: priceTypesApi.listPriceTypes,
});
const priceTypes = computed(() => priceTypesData.value?.priceTypes ?? []);
const { data: categoriesData } = useQuery({
  queryKey: ["categories"],
  queryFn: categoriesApi.listCategories,
});
const categories = computed(() => categoriesData.value?.categories ?? []);

const name = ref("");
const brandColor = ref("#8b5e34");
const creditLimitMode = ref("block");
const exchangeRateMode = ref("cbu");
const slug = ref("");
const showcaseEnabled = ref(false);
const showcasePriceTypeId = ref("");
const showcaseCategoryId = ref("");

watch(
  company,
  (value) => {
    if (!value) return;
    name.value = value.name ?? "";
    brandColor.value = value.brandColor ?? "#8b5e34";
    creditLimitMode.value = value.settings?.creditLimitMode ?? "block";
    exchangeRateMode.value = value.settings?.exchangeRateMode ?? "cbu";
    slug.value = value.slug ?? "";
    showcaseEnabled.value = value.showcaseSettings?.enabled ?? false;
    showcasePriceTypeId.value = value.showcaseSettings?.priceTypeId ?? "";
    showcaseCategoryId.value = value.showcaseSettings?.categoryId ?? "";
  },
  { immediate: true },
);

const settingsError = ref("");
const isSavingSettings = ref(false);

/** @returns {Promise<void>} */
async function onSaveSettings() {
  settingsError.value = "";
  isSavingSettings.value = true;
  try {
    await companiesApi.updateMe({
      name: name.value || undefined,
      brandColor: brandColor.value || undefined,
      settings: {
        creditLimitMode: creditLimitMode.value,
        exchangeRateMode: exchangeRateMode.value,
      },
    });
    queryClient.invalidateQueries({ queryKey: ["company-me"] });
  } catch (err) {
    settingsError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSavingSettings.value = false;
  }
}

const showcaseError = ref("");
const isSavingShowcase = ref(false);

/** @returns {Promise<void>} */
async function onSaveShowcase() {
  showcaseError.value = "";
  isSavingShowcase.value = true;
  try {
    await companiesApi.updateMe({
      slug: slug.value || undefined,
      showcaseSettings: {
        enabled: showcaseEnabled.value,
        priceTypeId: showcasePriceTypeId.value || null,
        categoryId: showcaseCategoryId.value || null,
      },
    });
    queryClient.invalidateQueries({ queryKey: ["company-me"] });
  } catch (err) {
    showcaseError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSavingShowcase.value = false;
  }
}

const logoFile = ref(null);
const logoError = ref("");
const isUploadingLogo = ref(false);

/** @param {Event} event */
function onLogoFileChange(event) {
  logoFile.value = event.target.files?.[0] ?? null;
}

/** @returns {Promise<void>} */
async function onUploadLogo() {
  logoError.value = "";
  if (!logoFile.value) {
    logoError.value = "Rasm faylini tanlang";
    return;
  }
  isUploadingLogo.value = true;
  try {
    await companiesApi.uploadLogo(logoFile.value);
    logoFile.value = null;
    queryClient.invalidateQueries({ queryKey: ["company-logo-url"] });
    queryClient.invalidateQueries({ queryKey: ["company-me"] });
  } catch (err) {
    logoError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isUploadingLogo.value = false;
  }
}

const manualRate = ref("");
const rateError = ref("");
const isSavingRate = ref(false);

/** @returns {Promise<void>} */
async function onSaveRate() {
  rateError.value = "";
  const rate = Number(manualRate.value);
  if (!rate || rate <= 0) {
    rateError.value = "Kursni kiriting";
    return;
  }
  isSavingRate.value = true;
  try {
    await exchangeRatesApi.setRate({ currency: "USD", rate });
    manualRate.value = "";
    queryClient.invalidateQueries({ queryKey: ["exchange-rate-current"] });
  } catch (err) {
    rateError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSavingRate.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="text-2xl font-semibold text-brand-brown">Kompaniya sozlamalari</h1>

    <Card class="mt-4">
      <CardHeader><CardTitle>Brending</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <img
            v-if="logo?.url"
            :src="logo.url"
            alt="Logo"
            class="h-16 w-16 rounded-md border border-brand-brown/10 object-contain"
          />
          <div
            v-else
            class="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-brand-brown/20 text-xs text-brand-brown/40"
          >
            Logo yo'q
          </div>
          <div class="flex flex-1 items-end gap-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="onLogoFileChange"
            />
            <Button :disabled="isUploadingLogo" variant="outline" @click="onUploadLogo">
              {{ isUploadingLogo ? "Yuklanmoqda…" : "Yuklash" }}
            </Button>
          </div>
        </div>
        <p v-if="logoError" class="text-sm text-red-600">{{ logoError }}</p>

        <div class="flex flex-col gap-1.5">
          <Label for="company-name">Kompaniya nomi</Label>
          <Input id="company-name" v-model="name" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="brand-color">Brend rangi</Label>
          <input id="brand-color" v-model="brandColor" type="color" class="h-10 w-20" />
        </div>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader><CardTitle>Qarz va valyuta sozlamalari</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <Label for="credit-mode">Kredit limiti oshganda</Label>
          <select
            id="credit-mode"
            v-model="creditLimitMode"
            class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
          >
            <option value="block">Bloklansin</option>
            <option value="warn">Faqat ogohlantirilsin</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="rate-mode">USD kursi manbasi</Label>
          <select
            id="rate-mode"
            v-model="exchangeRateMode"
            class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
          >
            <option value="cbu">CBU rasmiy kursi (kompaniya kursi qo'yilmaguncha)</option>
            <option value="manual">Faqat kompaniya kursi</option>
          </select>
        </div>
        <p v-if="settingsError" class="text-sm text-red-600">{{ settingsError }}</p>
        <Button :disabled="isSavingSettings" class="self-start" @click="onSaveSettings">
          {{ isSavingSettings ? "Saqlanmoqda…" : "Sozlamalarni saqlash" }}
        </Button>

        <div class="border-t border-brand-brown/10 pt-4">
          <p class="text-sm text-brand-brown/70">
            Joriy USD kursi:
            <span class="font-semibold text-brand-brown">
              {{
                currentRate
                  ? `${currentRate.rate} (${currentRate.source === "cbu" ? "CBU" : "kompaniya"})`
                  : "belgilanmagan"
              }}
            </span>
          </p>
          <div class="mt-2 flex items-end gap-3">
            <div class="flex flex-col gap-1.5">
              <Label for="manual-rate">Kompaniya kursi (1 USD = ? UZS)</Label>
              <Input id="manual-rate" v-model="manualRate" type="number" class="w-40" />
            </div>
            <Button :disabled="isSavingRate" variant="outline" @click="onSaveRate">
              {{ isSavingRate ? "Saqlanmoqda…" : "Kursni qo'yish" }}
            </Button>
          </div>
          <p v-if="rateError" class="mt-1 text-sm text-red-600">{{ rateError }}</p>
        </div>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader><CardTitle>Vitrina</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-4">
        <label class="flex items-center gap-2 text-sm text-brand-brown">
          <input id="showcase-enabled" v-model="showcaseEnabled" type="checkbox" />
          Vitrina yoqilgan (ochiq katalog + zakaz so'rovi)
        </label>

        <div class="flex flex-col gap-1.5">
          <Label for="showcase-slug">Vitrina manzili (slug)</Label>
          <Input id="showcase-slug" v-model="slug" placeholder="masalan: murcha-savdo" />
          <p v-if="slug" class="text-xs text-brand-brown/60">murcha.uz/{{ slug }}</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="showcase-price-type">Narx turi</Label>
          <select
            id="showcase-price-type"
            v-model="showcasePriceTypeId"
            class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
          >
            <option value="">Standart narx turi</option>
            <option v-for="pt in priceTypes" :key="pt.id" :value="pt.id">{{ pt.name }}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="showcase-category">Kategoriya</Label>
          <select
            id="showcase-category"
            v-model="showcaseCategoryId"
            class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
          >
            <option value="">Barcha mahsulotlar</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.nameUz }}
            </option>
          </select>
        </div>

        <p v-if="showcaseError" class="text-sm text-red-600">{{ showcaseError }}</p>
        <Button :disabled="isSavingShowcase" class="self-start" @click="onSaveShowcase">
          {{ isSavingShowcase ? "Saqlanmoqda…" : "Vitrinani saqlash" }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
