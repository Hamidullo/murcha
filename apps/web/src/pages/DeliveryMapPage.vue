<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/vue-query";
import * as companyMembersApi from "../api/company-members.api.js";
import { getSocket } from "../lib/socket.js";

const TASHKENT_CENTER = [41.311, 69.279];
const STALE_MS = 2 * 60 * 1000;

const { data: membersData } = useQuery({
  queryKey: ["company-members"],
  queryFn: companyMembersApi.listEmployees,
});
const members = computed(() => membersData.value?.members ?? []);

/**
 * @param {string} courierMemberId
 * @returns {string}
 */
function courierName(courierMemberId) {
  return members.value.find((m) => m.id === courierMemberId)?.user.fullName ?? "Kuryer";
}

const mapEl = ref(null);
/** @type {L.Map | null} */
let map = null;
/** @type {Map<string, { marker: L.Marker, recordedAt: Date }>} */
const markers = new Map();
let staleCheckInterval = null;

/**
 * @param {boolean} isStale
 * @returns {L.DivIcon}
 */
function courierIcon(isStale) {
  const color = isStale ? "#9ca3af" : "#16a34a";
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/**
 * @param {{ courierMemberId: string, lat: number, lng: number, recordedAt: string }} position
 * @returns {void}
 */
function handlePosition(position) {
  if (!map) return;
  const recordedAt = new Date(position.recordedAt);
  const existing = markers.get(position.courierMemberId);
  if (existing) {
    existing.marker.setLatLng([position.lat, position.lng]);
    existing.marker.setIcon(courierIcon(false));
    existing.recordedAt = recordedAt;
  } else {
    const marker = L.marker([position.lat, position.lng], { icon: courierIcon(false) })
      .addTo(map)
      .bindTooltip(courierName(position.courierMemberId), { permanent: true, direction: "top" });
    markers.set(position.courierMemberId, { marker, recordedAt });
  }
}

function refreshStaleness() {
  const now = Date.now();
  for (const { marker, recordedAt } of markers.values()) {
    marker.setIcon(courierIcon(now - recordedAt.getTime() > STALE_MS));
  }
}

onMounted(() => {
  map = L.map(mapEl.value).setView(TASHKENT_CENTER, 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  getSocket()?.on("courier:position", handlePosition);
  staleCheckInterval = setInterval(refreshStaleness, 15000);
});

onUnmounted(() => {
  getSocket()?.off("courier:position", handlePosition);
  clearInterval(staleCheckInterval);
  map?.remove();
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-brand-brown">Kuryerlar xaritasi</h1>
    <div ref="mapEl" class="mt-4 h-[70vh] w-full rounded-xl border border-brand-brown/10"></div>
  </div>
</template>
