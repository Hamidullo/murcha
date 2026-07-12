<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import * as deliveriesApi from "../api/deliveries.api.js";
import * as companyMembersApi from "../api/company-members.api.js";
import Button from "@/components/ui/button/Button.vue";

const STATUS_LABELS = { assigned: "Yo'lda", done: "Yakunlangan" };

const router = useRouter();

const { data: membersData } = useQuery({
  queryKey: ["company-members"],
  queryFn: companyMembersApi.listEmployees,
});
const members = computed(() => membersData.value?.members ?? []);

const {
  data: deliveriesData,
  isLoading,
  isError,
} = useQuery({
  queryKey: ["deliveries"],
  queryFn: () => deliveriesApi.listDeliveries(),
});
const deliveries = computed(() => deliveriesData.value?.deliveries ?? []);

/**
 * @param {string} courierMemberId
 * @returns {string}
 */
function courierName(courierMemberId) {
  return members.value.find((m) => m.id === courierMemberId)?.user.fullName ?? "—";
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">Dostavkalar</h1>
      <Button size="sm" @click="router.push({ name: 'delivery-new' })">Yangi dostavka</Button>
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">Yuklanmoqda…</p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">Ro'yxatni yuklab bo'lmadi</p>
    <p v-else-if="deliveries.length === 0" class="mt-6 text-sm text-brand-brown/60">
      Dostavka yo'q
    </p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-brand-brown/10 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-brand-brown/10 text-brand-brown/60">
          <tr>
            <th class="px-4 py-3 font-medium">Sana</th>
            <th class="px-4 py-3 font-medium">Kuryer</th>
            <th class="px-4 py-3 font-medium">Holat</th>
            <th class="px-4 py-3 font-medium">Kutilgan naqd</th>
            <th class="px-4 py-3 font-medium">Yig'ilgan naqd</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="d in deliveries"
            :key="d.id"
            class="cursor-pointer border-b border-brand-brown/5 last:border-0 hover:bg-brand-cream"
            @click="router.push({ name: 'delivery-detail', params: { id: d.id } })"
          >
            <td class="px-4 py-3 text-brand-brown">
              {{ new Date(d.date).toLocaleDateString("uz-UZ") }}
            </td>
            <td class="px-4 py-3 text-brand-brown/70">{{ courierName(d.courierMemberId) }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ STATUS_LABELS[d.status] ?? d.status }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ Number(d.cashExpected) }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ Number(d.cashCollected) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
