<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import * as companyMembersApi from "../api/company-members.api.js";
import Button from "@/components/ui/button/Button.vue";

const router = useRouter();

const {
  data: membersData,
  isLoading,
  isError,
} = useQuery({
  queryKey: ["company-members"],
  queryFn: companyMembersApi.listEmployees,
});
const members = computed(() => membersData.value?.members ?? []);
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">Hodimlar</h1>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" @click="router.push({ name: 'roles' })">
          Rollar
        </Button>
        <Button size="sm" @click="router.push({ name: 'employee-new' })">Yangi hodim</Button>
      </div>
    </div>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">Yuklanmoqda…</p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">Ro'yxatni yuklab bo'lmadi</p>
    <p v-else-if="members.length === 0" class="mt-6 text-sm text-brand-brown/60">Hodim yo'q</p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-brand-brown/10 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-brand-brown/10 text-brand-brown/60">
          <tr>
            <th class="px-4 py-3 font-medium">Ism</th>
            <th class="px-4 py-3 font-medium">Telefon</th>
            <th class="px-4 py-3 font-medium">Rol</th>
            <th class="px-4 py-3 font-medium">Holat</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in members"
            :key="m.id"
            class="cursor-pointer border-b border-brand-brown/5 last:border-0 hover:bg-brand-cream"
            @click="router.push({ name: 'employee-edit', params: { id: m.id } })"
          >
            <td class="px-4 py-3 text-brand-brown">{{ m.user.fullName }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ m.user.phone }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ m.role.name }}</td>
            <td class="px-4 py-3 text-brand-brown/70">
              {{ m.status === "active" ? "Faol" : "Bloklangan" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
