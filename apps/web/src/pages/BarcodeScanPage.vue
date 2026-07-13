<script setup>
import { ref, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import * as productsApi from "../api/products.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";

const router = useRouter();
const { t } = useI18n();

const barcodeInput = ref("");
const inputRef = ref(null);
const error = ref("");
const isLoading = ref(false);
const foundProduct = ref(null);

const hasCameraSupport = "BarcodeDetector" in window;
const isScanning = ref(false);
const videoRef = ref(null);
let mediaStream = null;
let detectRequest = null;

/**
 * @param {string} barcode
 * @returns {Promise<void>}
 */
async function lookup(barcode) {
  if (!barcode.trim()) return;
  error.value = "";
  foundProduct.value = null;
  isLoading.value = true;
  try {
    foundProduct.value = await productsApi.getProductByBarcode(barcode.trim());
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : t("barcodeScan.unexpectedError");
  } finally {
    isLoading.value = false;
  }
}

/** @returns {Promise<void>} */
async function onManualSubmit() {
  await lookup(barcodeInput.value);
  barcodeInput.value = "";
  await nextTick();
  inputRef.value?.focus();
}

/** @returns {void} */
function goToProduct() {
  if (!foundProduct.value) return;
  router.push({ name: "product-edit", params: { id: foundProduct.value.id } });
}

/** @returns {Promise<void>} */
async function startCamera() {
  if (!hasCameraSupport) return;
  error.value = "";
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    videoRef.value.srcObject = mediaStream;
    await videoRef.value.play();
    isScanning.value = true;
    scanFrame();
  } catch {
    error.value = t("barcodeScan.cameraPermissionDenied");
  }
}

/** @returns {void} */
function stopCamera() {
  isScanning.value = false;
  if (detectRequest) cancelAnimationFrame(detectRequest);
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
}

/** @returns {void} */
function scanFrame() {
  if (!isScanning.value) return;
  const detector = new BarcodeDetector({ formats: ["ean_13", "code_128", "upc_a", "qr_code"] });
  detector
    .detect(videoRef.value)
    .then(async (codes) => {
      if (codes.length > 0) {
        stopCamera();
        await lookup(codes[0].rawValue);
        return;
      }
      detectRequest = requestAnimationFrame(scanFrame);
    })
    .catch(() => {
      detectRequest = requestAnimationFrame(scanFrame);
    });
}

onBeforeUnmount(() => stopCamera());
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-2xl font-semibold text-brand-brown">{{ t("barcodeScan.title") }}</h1>
    <p class="mt-1 text-sm text-brand-brown/60">
      {{ t("barcodeScan.subtitle") }}
    </p>

    <form class="mt-4 flex gap-2" @submit.prevent="onManualSubmit">
      <Input
        ref="inputRef"
        v-model="barcodeInput"
        autofocus
        :placeholder="t('barcodeScan.placeholder')"
        class="flex-1"
      />
      <Button type="submit">{{ t("barcodeScan.search") }}</Button>
    </form>

    <div v-if="hasCameraSupport" class="mt-4">
      <Button v-if="!isScanning" variant="outline" size="sm" @click="startCamera">
        {{ t("barcodeScan.startCamera") }}
      </Button>
      <Button v-else variant="outline" size="sm" @click="stopCamera">
        {{ t("barcodeScan.stopCamera") }}
      </Button>
      <video
        v-show="isScanning"
        ref="videoRef"
        class="mt-3 w-full rounded-md border border-brand-brown/10"
        muted
        playsinline
      ></video>
    </div>
    <p v-else class="mt-4 text-xs text-brand-brown/50">
      {{ t("barcodeScan.noCameraSupport") }}
    </p>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">{{ t("barcodeScan.loading") }}</p>
    <p v-else-if="error" class="mt-6 text-sm text-red-600">{{ error }}</p>
    <div
      v-else-if="foundProduct"
      class="mt-6 cursor-pointer rounded-xl border border-brand-brown/10 bg-white p-4"
      @click="goToProduct"
    >
      <p class="font-medium text-brand-brown">{{ foundProduct.nameUz }}</p>
      <p class="text-sm text-brand-brown/60">
        {{ t("barcodeScan.skuLabel", { sku: foundProduct.sku }) }}
      </p>
    </div>
  </div>
</template>
