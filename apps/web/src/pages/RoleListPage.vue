<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { createRoleSchema } from "@murcha/shared";
import * as rolesApi from "../api/roles.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";

const router = useRouter();
const queryClient = useQueryClient();

const {
  data: rolesData,
  isLoading,
  isError,
} = useQuery({ queryKey: ["roles"], queryFn: rolesApi.listRoles });
const roles = computed(() => rolesData.value?.roles ?? []);

const newRoleName = ref("");
const createError = ref("");
const isCreating = ref(false);

/** @returns {Promise<void>} */
async function onCreate() {
  createError.value = "";
  const parsed = createRoleSchema.safeParse({ name: newRoleName.value });
  if (!parsed.success) {
    createError.value = parsed.error.issues[0]?.message ?? "Noto'g'ri qiymat";
    return;
  }
  isCreating.value = true;
  try {
    await rolesApi.createRole(parsed.data);
    newRoleName.value = "";
    queryClient.invalidateQueries({ queryKey: ["roles"] });
  } catch (err) {
    createError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-brand-brown">Rollar</h1>
      <Button variant="outline" size="sm" @click="router.push({ name: 'employees' })">
        Hodimlar
      </Button>
    </div>

    <div class="mt-4 flex gap-2">
      <Input v-model="newRoleName" placeholder="Yangi rol nomi" @keyup.enter="onCreate" />
      <Button :disabled="isCreating" @click="onCreate">{{ isCreating ? "…" : "Qo'shish" }}</Button>
    </div>
    <p v-if="createError" class="mt-1 text-xs text-red-600">{{ createError }}</p>

    <p v-if="isLoading" class="mt-6 text-sm text-brand-brown/60">Yuklanmoqda…</p>
    <p v-else-if="isError" class="mt-6 text-sm text-red-600">Ro'yxatni yuklab bo'lmadi</p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-brand-brown/10 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-brand-brown/10 text-brand-brown/60">
          <tr>
            <th class="px-4 py-3 font-medium">Nomi</th>
            <th class="px-4 py-3 font-medium">Turi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in roles"
            :key="r.id"
            class="cursor-pointer border-b border-brand-brown/5 last:border-0 hover:bg-brand-cream"
            @click="router.push({ name: 'role-permissions', params: { id: r.id } })"
          >
            <td class="px-4 py-3 text-brand-brown">{{ r.name }}</td>
            <td class="px-4 py-3 text-brand-brown/70">{{ r.isSystem ? "Tizim" : "Maxsus" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
