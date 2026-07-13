<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as ordersApi from "../api/orders.api.js";
import * as shopCatalogApi from "../api/shop-catalog.api.js";
import { ApiError } from "../api/client.js";
import { getSocket } from "../lib/socket.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import { Card, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const STATUS_LABELS = computed(() => ({
  new: t("orderDetail.status.new"),
  confirmed: t("orderDetail.status.confirmed"),
  picking: t("orderDetail.status.picking"),
  shipped: t("orderDetail.status.shipped"),
  delivered: t("orderDetail.status.delivered"),
  accepted: t("orderDetail.status.accepted"),
  cancelled: t("orderDetail.status.cancelled"),
}));

const route = useRoute();
const queryClient = useQueryClient();
const orderId = computed(() => route.params.id);

const {
  data: order,
  isLoading,
  isError,
  refetch: refetchOrder,
} = useQuery({
  queryKey: computed(() => ["order", orderId.value]),
  queryFn: () => ordersApi.getOrder(orderId.value),
});

// Mahsulot nomlarini ko'rsatish uchun — `Order.items` faqat `productId`ni
// saqlaydi (`warehouse_docs`dagi bilan bir xil konvensiya), nomi mavjud
// `shop-catalog`dan (do'kon operatorining o'zi ko'ra oladigan yagona
// mahsulot ro'yxati) qidirib topiladi.
const { data: catalogData } = useQuery({
  queryKey: ["shop-catalog"],
  queryFn: () => shopCatalogApi.listCatalog(),
});
const productNames = computed(() => {
  const map = new Map();
  for (const item of catalogData.value?.items ?? []) {
    map.set(item.productId, item.nameUz);
  }
  return map;
});

/**
 * @param {string} productId
 * @returns {string}
 */
function productName(productId) {
  return productNames.value.get(productId) ?? productId;
}

const actionError = ref("");
const isActing = ref(false);

/**
 * @param {() => Promise<unknown>} action
 * @returns {Promise<void>}
 */
async function runAction(action) {
  actionError.value = "";
  isActing.value = true;
  try {
    await action();
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    await refetchOrder();
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : t("orderDetail.unexpectedError");
  } finally {
    isActing.value = false;
  }
}

// --- Kuryer jonli joylashuvi ("shipped" holatida, mini-xarita) ---
const courierMemberId = computed(() => order.value?.deliveryOrders?.[0]?.delivery?.courierMemberId);
const mapEl = ref(null);
/** @type {L.Map | null} */
let map = null;
/** @type {L.Marker | null} */
let marker = null;

/**
 * @param {{ courierMemberId: string, lat: number, lng: number }} position
 * @returns {void}
 */
function handlePosition(position) {
  if (position.courierMemberId !== courierMemberId.value || !map) return;
  const latLng = [position.lat, position.lng];
  if (marker) {
    marker.setLatLng(latLng);
  } else {
    marker = L.marker(latLng).addTo(map);
  }
  map.setView(latLng);
}

watch(
  () => order.value?.status === "shipped" && Boolean(courierMemberId.value),
  async (shouldShowMap) => {
    if (!shouldShowMap || map) return;
    await nextTick();
    if (!mapEl.value) return;
    map = L.map(mapEl.value).setView([41.311, 69.279], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
  },
  { immediate: true },
);

onMounted(() => getSocket()?.on("courier:position", handlePosition));
onUnmounted(() => {
  getSocket()?.off("courier:position", handlePosition);
  map?.remove();
});

// --- Qabul qilish (farqlar akti, "delivered" holatida) ---
const acceptCode = ref("");
const qtyAccepted = reactive({});
watch(
  order,
  (value) => {
    if (!value || value.status !== "delivered") return;
    for (const item of value.items) {
      if (!(item.id in qtyAccepted)) {
        qtyAccepted[item.id] = Number(item.qtyShipped);
      }
    }
  },
  { immediate: true },
);

/** @returns {Promise<void>} */
function onAccept() {
  return runAction(() =>
    ordersApi.acceptOrder(orderId.value, {
      acceptCode: acceptCode.value,
      items: order.value.items.map((item) => ({
        orderItemId: item.id,
        qtyAccepted: Number(qtyAccepted[item.id]),
      })),
    }),
  );
}

// --- Qaytarish (vozvrat, "accepted" holatida) ---
const returnQty = reactive({});
watch(
  order,
  (value) => {
    if (!value || value.status !== "accepted") return;
    for (const item of value.items) {
      if (!(item.id in returnQty)) {
        returnQty[item.id] = 0;
      }
    }
  },
  { immediate: true },
);

/** @returns {Promise<void>} */
function onReturn() {
  const items = order.value.items
    .filter((item) => Number(returnQty[item.id]) > 0)
    .map((item) => ({ orderItemId: item.id, qty: Number(returnQty[item.id]) }));
  if (items.length === 0) {
    actionError.value = t("orderDetail.returnQtyRequired");
    return Promise.resolve();
  }
  return runAction(() => ordersApi.returnOrder(orderId.value, { items }));
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <p v-if="isLoading" class="text-sm text-brand-brown/60">{{ t("orderDetail.loading") }}</p>
    <p v-else-if="isError" class="text-sm text-red-600">{{ t("orderDetail.loadError") }}</p>

    <template v-else-if="order">
      <h1 class="text-lg font-semibold text-brand-brown">№ {{ order.number }}</h1>
      <p class="text-sm text-brand-brown/60">
        {{ STATUS_LABELS[order.status] ?? order.status }}
      </p>

      <div v-if="order.status === 'shipped' && courierMemberId" class="mt-3">
        <p class="mb-2 text-sm text-brand-brown/70">{{ t("orderDetail.courierOnTheWay") }}</p>
        <div ref="mapEl" class="h-48 w-full rounded-lg border border-brand-brown/10"></div>
      </div>

      <div class="mt-4 flex flex-col gap-3">
        <Card v-for="item in order.items" :key="item.id">
          <CardContent class="flex items-center justify-between p-4">
            <div>
              <p class="font-medium text-brand-brown">{{ productName(item.productId) }}</p>
              <p class="text-sm text-brand-brown/60">
                {{ Number(item.price).toLocaleString("uz-UZ") }} × {{ Number(item.qtyOrdered) }}
              </p>
            </div>
            <div v-if="order.status === 'delivered'" class="w-20">
              <Input v-model="qtyAccepted[item.id]" type="number" />
            </div>
            <div v-else-if="order.status === 'accepted'" class="w-20">
              <Input v-model="returnQty[item.id]" type="number" />
            </div>
            <p v-else class="font-semibold text-brand-brown">
              {{ Number(item.total).toLocaleString("uz-UZ") }}
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="mt-4 flex items-center justify-between text-brand-brown">
        <span class="font-medium">{{ t("orderDetail.total") }}</span>
        <span class="font-semibold">
          {{ Number(order.total).toLocaleString("uz-UZ") }} {{ order.currency }}
        </span>
      </div>

      <p v-if="actionError" class="mt-2 text-sm text-red-600">{{ actionError }}</p>

      <div v-if="order.status === 'delivered'" class="mt-4 space-y-3">
        <div>
          <label class="text-sm font-medium text-brand-brown">{{
            t("orderDetail.courierCodeLabel")
          }}</label>
          <Input v-model="acceptCode" class="mt-1" maxlength="4" />
        </div>
        <Button class="w-full" :disabled="isActing" @click="onAccept">
          {{ t("orderDetail.accept") }}
        </Button>
      </div>

      <div v-else-if="order.status === 'accepted'" class="mt-4">
        <Button class="w-full" variant="outline" :disabled="isActing" @click="onReturn">
          {{ t("orderDetail.return") }}
        </Button>
      </div>
    </template>
  </div>
</template>
