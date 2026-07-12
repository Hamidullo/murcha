<script setup>
import { ref, reactive, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { createEmployeeSchema, updateEmployeeSchema } from "@murcha/shared";
import * as companyMembersApi from "../api/company-members.api.js";
import * as rolesApi from "../api/roles.api.js";
import * as warehousesApi from "../api/warehouses.api.js";
import * as salePointsApi from "../api/sale-points.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();

const memberId = computed(() => route.params.id ?? null);
const isEdit = computed(() => Boolean(memberId.value));

const form = reactive({
  phone: "",
  fullName: "",
  roleId: "",
  status: "active",
});
/** @type {import("vue").Reactive<Array<{ targetType: "warehouse" | "sale_point", targetId: string }>>} */
const assignments = reactive([]);
const fieldErrors = ref({});
const formError = ref("");
const isSubmitting = ref(false);
const resetError = ref("");
const resetDone = ref(false);
const isResetting = ref(false);

const { data: rolesData } = useQuery({ queryKey: ["roles"], queryFn: rolesApi.listRoles });
const roles = computed(() => rolesData.value?.roles ?? []);

const { data: warehousesData } = useQuery({
  queryKey: ["warehouses"],
  queryFn: warehousesApi.listWarehouses,
});
const warehouses = computed(() => warehousesData.value?.warehouses ?? []);

const { data: salePointsData } = useQuery({
  queryKey: ["sale-points"],
  queryFn: salePointsApi.listSalePoints,
});
const salePoints = computed(() => salePointsData.value?.salePoints ?? []);

const { data: memberData } = useQuery({
  queryKey: computed(() => ["company-member", memberId.value]),
  queryFn: () => companyMembersApi.getEmployee(memberId.value),
  enabled: isEdit,
});

watch(
  memberData,
  (member) => {
    if (!member) return;
    form.phone = member.user.phone;
    form.fullName = member.user.fullName;
    form.roleId = member.roleId;
    form.status = member.status;
  },
  { immediate: true },
);

function addAssignment() {
  assignments.push({ targetType: "warehouse", targetId: "" });
}

/** @param {number} index */
function removeAssignment(index) {
  assignments.splice(index, 1);
}

/** @returns {Promise<void>} */
async function onSubmit() {
  formError.value = "";
  fieldErrors.value = {};

  if (isEdit.value) {
    const dto = { roleId: form.roleId, status: form.status };
    const parsed = updateEmployeeSchema.safeParse(dto);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) fieldErrors.value[issue.path[0]] = issue.message;
      return;
    }
    isSubmitting.value = true;
    try {
      await companyMembersApi.updateEmployee(memberId.value, parsed.data);
      queryClient.invalidateQueries({ queryKey: ["company-member", memberId.value] });
      queryClient.invalidateQueries({ queryKey: ["company-members"] });
    } catch (err) {
      formError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
    } finally {
      isSubmitting.value = false;
    }
    return;
  }

  const dto = {
    phone: form.phone,
    fullName: form.fullName,
    roleId: form.roleId,
    assignments: assignments.filter((a) => a.targetId),
  };
  if (dto.assignments.length === 0) delete dto.assignments;
  const parsed = createEmployeeSchema.safeParse(dto);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors.value[issue.path[0]] = issue.message;
    return;
  }
  isSubmitting.value = true;
  try {
    const created = await companyMembersApi.createEmployee(parsed.data);
    queryClient.invalidateQueries({ queryKey: ["company-members"] });
    router.replace({ name: "employee-edit", params: { id: created.id } });
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSubmitting.value = false;
  }
}

/** @returns {Promise<void>} */
async function onResetPassword() {
  resetError.value = "";
  resetDone.value = false;
  isResetting.value = true;
  try {
    await companyMembersApi.resetEmployeePassword(memberId.value);
    resetDone.value = true;
  } catch (err) {
    resetError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isResetting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <h1 class="text-2xl font-semibold text-brand-brown">
      {{ isEdit ? "Hodimni tahrirlash" : "Yangi hodim" }}
    </h1>

    <Card class="mt-4">
      <CardContent class="pt-6">
        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-1.5">
            <Label for="phone">Telefon</Label>
            <Input id="phone" v-model="form.phone" :disabled="isEdit" placeholder="+998901234567" />
            <p v-if="fieldErrors.phone" class="text-xs text-red-600">{{ fieldErrors.phone }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="fullName">F.I.O</Label>
            <Input id="fullName" v-model="form.fullName" :disabled="isEdit" />
            <p v-if="fieldErrors.fullName" class="text-xs text-red-600">
              {{ fieldErrors.fullName }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="roleId">Rol</Label>
            <select
              id="roleId"
              v-model="form.roleId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="" disabled>Tanlang</option>
              <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
            <p v-if="fieldErrors.roleId" class="text-xs text-red-600">{{ fieldErrors.roleId }}</p>
          </div>
          <div v-if="isEdit" class="flex flex-col gap-1.5">
            <Label for="status">Holat</Label>
            <select
              id="status"
              v-model="form.status"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="active">Faol</option>
              <option value="blocked">Bloklangan</option>
            </select>
          </div>

          <div v-if="!isEdit" class="flex flex-col gap-2">
            <Label>Biriktirish (sklad/nuqta)</Label>
            <div
              v-for="(a, i) in assignments"
              :key="i"
              class="flex items-center gap-2 rounded-md border border-brand-brown/10 p-2"
            >
              <select
                v-model="a.targetType"
                class="h-9 rounded-md border border-brand-brown/20 bg-white px-2 text-sm"
              >
                <option value="warehouse">Sklad</option>
                <option value="sale_point">Sotuv nuqtasi</option>
              </select>
              <select
                v-model="a.targetId"
                class="h-9 flex-1 rounded-md border border-brand-brown/20 bg-white px-2 text-sm"
              >
                <option value="" disabled>Tanlang</option>
                <option
                  v-for="opt in a.targetType === 'warehouse' ? warehouses : salePoints"
                  :key="opt.id"
                  :value="opt.id"
                >
                  {{ opt.name }}
                </option>
              </select>
              <Button type="button" variant="ghost" size="sm" @click="removeAssignment(i)">
                O'chirish
              </Button>
            </div>
            <Button type="button" variant="outline" size="sm" @click="addAssignment">
              + Biriktirish qo'shish
            </Button>
          </div>

          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <Button type="submit" :disabled="isSubmitting" class="w-full">
            {{ isSubmitting ? "Saqlanmoqda…" : "Saqlash" }}
          </Button>
        </form>
      </CardContent>
    </Card>

    <Card v-if="isEdit" class="mt-4">
      <CardHeader><CardTitle>Parolni tiklash</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-2">
        <p class="text-sm text-brand-brown/60">
          Eski parol darhol bekor qilinadi, hodimga SMS orqali yangi havola yuboriladi.
        </p>
        <Button variant="outline" :disabled="isResetting" class="w-fit" @click="onResetPassword">
          {{ isResetting ? "…" : "Parolni tiklash" }}
        </Button>
        <p v-if="resetDone" class="text-xs text-green-700">SMS yuborildi</p>
        <p v-if="resetError" class="text-xs text-red-600">{{ resetError }}</p>
      </CardContent>
    </Card>
  </div>
</template>
