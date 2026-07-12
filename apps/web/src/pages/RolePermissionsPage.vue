<script setup>
import { ref, reactive, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import * as rolesApi from "../api/roles.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardContent } from "@/components/ui/card";

const route = useRoute();
const router = useRouter();

const roleId = computed(() => route.params.id);

const { data: rolesData } = useQuery({ queryKey: ["roles"], queryFn: rolesApi.listRoles });
const role = computed(() => rolesData.value?.roles.find((r) => r.id === roleId.value));

const { data: allPermissionsData } = useQuery({
  queryKey: ["permissions"],
  queryFn: rolesApi.listAllPermissions,
});
const allPermissions = computed(() => allPermissionsData.value?.permissions ?? []);

const { data: rolePermissionsData } = useQuery({
  queryKey: computed(() => ["role-permissions", roleId.value]),
  queryFn: () => rolesApi.listRolePermissions(roleId.value),
});

/** @type {import("vue").Reactive<Set<string>>} */
const checked = reactive(new Set());
watch(
  rolePermissionsData,
  (data) => {
    if (!data) return;
    checked.clear();
    for (const id of data.permissionIds) checked.add(id);
  },
  { immediate: true },
);

/** @param {string} permissionId */
function toggle(permissionId) {
  if (checked.has(permissionId)) {
    checked.delete(permissionId);
  } else {
    checked.add(permissionId);
  }
}

const isSaving = ref(false);
const saveError = ref("");
const saveDone = ref(false);

/** @returns {Promise<void>} */
async function onSave() {
  saveError.value = "";
  saveDone.value = false;
  isSaving.value = true;
  try {
    await rolesApi.setRolePermissions(roleId.value, [...checked]);
    saveDone.value = true;
  } catch (err) {
    saveError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="sm" @click="router.push({ name: 'roles' })">←</Button>
      <h1 class="text-2xl font-semibold text-brand-brown">{{ role?.name ?? "Rol" }} — ruxsatlar</h1>
    </div>
    <p v-if="role?.isSystem" class="mt-1 text-sm text-brand-brown/60">
      Tizim roli — ruxsatlarni ko'rish mumkin, o'zgartirib bo'lmaydi
    </p>

    <Card class="mt-4">
      <CardContent class="flex flex-col gap-2 pt-6">
        <label
          v-for="p in allPermissions"
          :key="p.id"
          class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-brand-cream"
        >
          <input
            type="checkbox"
            :checked="checked.has(p.id)"
            :disabled="role?.isSystem"
            @change="toggle(p.id)"
          />
          <span class="text-sm text-brand-brown">{{ p.code }}</span>
        </label>

        <Button v-if="!role?.isSystem" :disabled="isSaving" class="mt-2 w-fit" @click="onSave">
          {{ isSaving ? "Saqlanmoqda…" : "Saqlash" }}
        </Button>
        <p v-if="saveDone" class="text-xs text-green-700">Saqlandi</p>
        <p v-if="saveError" class="text-xs text-red-600">{{ saveError }}</p>
      </CardContent>
    </Card>
  </div>
</template>
