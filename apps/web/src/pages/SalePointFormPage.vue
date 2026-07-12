<script setup>
import { ref, reactive, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { createSalePointSchema, updateSalePointSchema } from "@murcha/shared";
import * as salePointsApi from "../api/sale-points.api.js";
import * as priceTypesApi from "../api/priceTypes.api.js";
import * as debtsApi from "../api/debts.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();

const salePointId = computed(() => route.params.id ?? null);
const isEdit = computed(() => Boolean(salePointId.value));

const OPTIONAL_FIELDS = ["address", "phone"];

const form = reactive({
  name: "",
  priceTypeId: "",
  address: "",
  phone: "",
  creditLimit: "",
  paymentTermDays: "",
});
const fieldErrors = ref({});
const formError = ref("");
const isSubmitting = ref(false);

const { data: priceTypesData } = useQuery({
  queryKey: ["price-types"],
  queryFn: priceTypesApi.listPriceTypes,
});
const priceTypes = computed(() => priceTypesData.value?.priceTypes ?? []);

const { data: salePointData } = useQuery({
  queryKey: computed(() => ["sale-point", salePointId.value]),
  queryFn: () => salePointsApi.getSalePoint(salePointId.value),
  enabled: isEdit,
});

const { data: balanceData } = useQuery({
  queryKey: computed(() => ["debt-balance", salePointData.value?.counterpartyId]),
  queryFn: () => debtsApi.getBalance(salePointData.value.counterpartyId),
  enabled: computed(() => isEdit.value && Boolean(salePointData.value?.counterpartyId)),
});

watch(
  salePointData,
  (sp) => {
    if (!sp) return;
    form.name = sp.name;
    form.priceTypeId = sp.priceTypeId;
    form.address = sp.address ?? "";
    form.phone = "";
    form.creditLimit = "";
    form.paymentTermDays = "";
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
  if (dto.creditLimit !== "") {
    dto.creditLimit = Number(dto.creditLimit);
  } else {
    delete dto.creditLimit;
  }
  if (dto.paymentTermDays !== "") {
    dto.paymentTermDays = Number(dto.paymentTermDays);
  } else {
    delete dto.paymentTermDays;
  }

  const schema = isEdit.value ? updateSalePointSchema : createSalePointSchema;
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
      await salePointsApi.updateSalePoint(salePointId.value, parsed.data);
      queryClient.invalidateQueries({ queryKey: ["sale-point", salePointId.value] });
    } else {
      const created = await salePointsApi.createSalePoint(parsed.data);
      queryClient.invalidateQueries({ queryKey: ["sale-points"] });
      router.replace({ name: "sale-point-edit", params: { id: created.id } });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["sale-points"] });
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSubmitting.value = false;
  }
}

// --- Operatorlar ---
const { data: operatorsData, refetch: refetchOperators } = useQuery({
  queryKey: computed(() => ["sale-point-operators", salePointId.value]),
  queryFn: () => salePointsApi.listOperators(salePointId.value),
  enabled: isEdit,
});
const operators = computed(() => operatorsData.value?.operators ?? []);

const newOperatorPhone = ref("");
const operatorError = ref("");
const isAssigning = ref(false);

/** @returns {Promise<void>} */
async function onAssignOperator() {
  operatorError.value = "";
  if (!newOperatorPhone.value.trim()) return;
  isAssigning.value = true;
  try {
    await salePointsApi.assignOperator(salePointId.value, newOperatorPhone.value.trim());
    newOperatorPhone.value = "";
    await refetchOperators();
  } catch (err) {
    operatorError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isAssigning.value = false;
  }
}

/**
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function onUnassignOperator(userId) {
  await salePointsApi.unassignOperator(salePointId.value, userId);
  await refetchOperators();
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <h1 class="text-2xl font-semibold text-brand-brown">
      {{ isEdit ? "Sotuv nuqtasini tahrirlash" : "Yangi sotuv nuqtasi" }}
    </h1>

    <Card class="mt-4">
      <CardContent class="pt-6">
        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-1.5">
            <Label for="name">Nomi</Label>
            <Input id="name" v-model="form.name" />
            <p v-if="fieldErrors.name" class="text-xs text-red-600">{{ fieldErrors.name }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="priceTypeId">Narx turi</Label>
            <select
              id="priceTypeId"
              v-model="form.priceTypeId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="" disabled>Tanlang</option>
              <option v-for="pt in priceTypes" :key="pt.id" :value="pt.id">{{ pt.name }}</option>
            </select>
            <p v-if="fieldErrors.priceTypeId" class="text-xs text-red-600">
              {{ fieldErrors.priceTypeId }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="address">Manzil</Label>
            <Input id="address" v-model="form.address" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="phone">Telefon</Label>
            <Input id="phone" v-model="form.phone" placeholder="O'zgartirmasa bo'sh qoldiring" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="creditLimit">Kredit limiti (so'm)</Label>
            <Input id="creditLimit" v-model="form.creditLimit" type="number" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="paymentTermDays">To'lov muddati (kun)</Label>
            <Input id="paymentTermDays" v-model="form.paymentTermDays" type="number" />
          </div>
          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <Button type="submit" :disabled="isSubmitting" class="w-full">
            {{ isSubmitting ? "Saqlanmoqda…" : "Saqlash" }}
          </Button>
        </form>
      </CardContent>
    </Card>

    <Card v-if="isEdit" class="mt-4">
      <CardHeader><CardTitle>Operatorlar</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-3">
        <div
          v-for="op in operators"
          :key="op.id"
          class="flex items-center justify-between rounded-md border border-brand-brown/10 px-3 py-2"
        >
          <div>
            <p class="text-sm text-brand-brown">{{ op.companyMember.user.fullName }}</p>
            <p class="text-xs text-brand-brown/60">{{ op.companyMember.user.phone }}</p>
          </div>
          <Button variant="ghost" size="sm" @click="onUnassignOperator(op.companyMember.user.id)">
            Olib tashlash
          </Button>
        </div>
        <p v-if="operators.length === 0" class="text-sm text-brand-brown/60">
          Operator biriktirilmagan
        </p>

        <div class="flex gap-2">
          <Input
            v-model="newOperatorPhone"
            placeholder="+998901234567"
            @keyup.enter="onAssignOperator"
          />
          <Button :disabled="isAssigning" @click="onAssignOperator">
            {{ isAssigning ? "…" : "Biriktirish" }}
          </Button>
        </div>
        <p v-if="operatorError" class="text-xs text-red-600">{{ operatorError }}</p>
      </CardContent>
    </Card>

    <Card v-if="isEdit && salePointData?.counterpartyId" class="mt-4">
      <CardHeader><CardTitle>Qarz holati</CardTitle></CardHeader>
      <CardContent class="flex items-center justify-between">
        <p class="text-lg font-semibold text-brand-brown">
          {{ balanceData ? `${balanceData.balance} ${balanceData.currency}` : "…" }}
        </p>
        <router-link
          :to="{ name: 'counterparty-statement', params: { id: salePointData.counterpartyId } }"
          class="text-sm text-brand-brown/70 underline hover:text-brand-brown"
        >
          Batafsil / To'lov
        </router-link>
      </CardContent>
    </Card>
  </div>
</template>
