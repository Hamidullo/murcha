<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import * as cashApi from "../api/cash.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const route = useRoute();
const queryClient = useQueryClient();
const registerId = computed(() => route.params.id);

const { data: registersData } = useQuery({
  queryKey: ["cash-registers"],
  queryFn: () => cashApi.listRegisters(),
});
const register = computed(() =>
  (registersData.value?.registers ?? []).find((r) => r.id === registerId.value),
);
const otherRegisters = computed(() =>
  (registersData.value?.registers ?? []).filter((r) => r.id !== registerId.value),
);

const { data: categoriesData } = useQuery({
  queryKey: ["cash-expense-categories"],
  queryFn: () => cashApi.listExpenseCategories(),
});

const { data: transactionsData } = useQuery({
  queryKey: computed(() => ["cash-transactions", registerId.value]),
  queryFn: () => cashApi.listTransactions({ cashRegisterId: registerId.value }),
});

const { data: shiftsData } = useQuery({
  queryKey: computed(() => ["cash-shifts", registerId.value]),
  queryFn: () => cashApi.listShifts(registerId.value),
});
const openShiftRecord = computed(() => (shiftsData.value?.shifts ?? []).find((s) => !s.closedAt));

function invalidateAll() {
  queryClient.invalidateQueries({ queryKey: ["cash-transactions", registerId.value] });
  queryClient.invalidateQueries({ queryKey: ["cash-shifts", registerId.value] });
}

// --- Tranzaksiya yaratish ---
const txType = ref("income");
const txAmount = ref("");
const txCategoryId = ref("");
const txComment = ref("");
const txError = ref("");
const isSubmittingTx = ref(false);

/** @returns {Promise<void>} */
async function onCreateTransaction() {
  txError.value = "";
  const amount = Number(txAmount.value);
  if (!amount || amount <= 0) {
    txError.value = "Summani kiriting";
    return;
  }
  isSubmittingTx.value = true;
  try {
    await cashApi.createTransaction({
      cashRegisterId: registerId.value,
      type: txType.value,
      amount,
      currency: register.value?.currency ?? "UZS",
      categoryId: txCategoryId.value || undefined,
      comment: txComment.value || undefined,
    });
    txAmount.value = "";
    txComment.value = "";
    invalidateAll();
  } catch (err) {
    txError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSubmittingTx.value = false;
  }
}

// --- Kassalar orasida ko'chirish ---
const transferToId = ref("");
const transferAmount = ref("");
const transferError = ref("");
const isSubmittingTransfer = ref(false);

/** @returns {Promise<void>} */
async function onTransfer() {
  transferError.value = "";
  const amount = Number(transferAmount.value);
  if (!transferToId.value || !amount || amount <= 0) {
    transferError.value = "Qabul qiluvchi kassa va summani kiriting";
    return;
  }
  isSubmittingTransfer.value = true;
  try {
    await cashApi.createTransfer({
      fromCashRegisterId: registerId.value,
      toCashRegisterId: transferToId.value,
      amount,
      currency: register.value?.currency ?? "UZS",
    });
    transferAmount.value = "";
    invalidateAll();
  } catch (err) {
    transferError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSubmittingTransfer.value = false;
  }
}

// --- Smena ochish/yopish ---
const openingBalance = ref("0");
const countedBalance = ref("");
const shiftError = ref("");
const isSubmittingShift = ref(false);

/** @returns {Promise<void>} */
async function onOpenShift() {
  shiftError.value = "";
  isSubmittingShift.value = true;
  try {
    await cashApi.openShift(registerId.value, {
      openingBalance: Number(openingBalance.value) || 0,
    });
    invalidateAll();
  } catch (err) {
    shiftError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSubmittingShift.value = false;
  }
}

/** @returns {Promise<void>} */
async function onCloseShift() {
  shiftError.value = "";
  if (countedBalance.value === "") {
    shiftError.value = "Sanoq natijasini kiriting";
    return;
  }
  isSubmittingShift.value = true;
  try {
    await cashApi.closeShift(openShiftRecord.value.id, {
      countedBalance: Number(countedBalance.value),
    });
    countedBalance.value = "";
    invalidateAll();
  } catch (err) {
    shiftError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSubmittingShift.value = false;
  }
}

const TYPE_LABELS = {
  income: "Kirim",
  expense: "Chiqim",
  transfer_in: "Ko'chirish (kirim)",
  transfer_out: "Ko'chirish (chiqim)",
};
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="text-2xl font-semibold text-brand-brown">
      {{ register?.name ?? "Kassa" }}
    </h1>

    <Card class="mt-4">
      <CardHeader><CardTitle>Smena</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-3">
        <div v-if="openShiftRecord" class="flex flex-col gap-3">
          <p class="text-sm text-brand-brown/70">
            Ochiq smena — boshlang'ich qoldiq: {{ openShiftRecord.openingBalance }}
            {{ register?.currency }}
          </p>
          <div class="flex items-end gap-3">
            <div class="flex flex-1 flex-col gap-1.5">
              <Label for="counted">Sanoq natijasi (naqd)</Label>
              <Input id="counted" v-model="countedBalance" type="number" />
            </div>
            <Button :disabled="isSubmittingShift" @click="onCloseShift">
              {{ isSubmittingShift ? "Yopilmoqda…" : "Smena yopish" }}
            </Button>
          </div>
        </div>
        <div v-else class="flex items-end gap-3">
          <div class="flex flex-1 flex-col gap-1.5">
            <Label for="opening">Boshlang'ich qoldiq</Label>
            <Input id="opening" v-model="openingBalance" type="number" />
          </div>
          <Button :disabled="isSubmittingShift" variant="outline" @click="onOpenShift">
            {{ isSubmittingShift ? "Ochilmoqda…" : "Smena ochish" }}
          </Button>
        </div>
        <p v-if="shiftError" class="text-sm text-red-600">{{ shiftError }}</p>

        <table
          v-if="(shiftsData?.shifts ?? []).some((s) => s.closedAt)"
          class="mt-2 w-full text-sm"
        >
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">Yopilgan</th>
              <th class="text-right">Kutilgan</th>
              <th class="text-right">Sanoq</th>
              <th class="text-right">Farq</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in (shiftsData?.shifts ?? []).filter((x) => x.closedAt)"
              :key="s.id"
              class="border-b border-brand-brown/5"
            >
              <td class="py-2">{{ new Date(s.closedAt).toLocaleString("uz") }}</td>
              <td class="text-right">{{ s.expectedBalance }}</td>
              <td class="text-right">{{ s.countedBalance }}</td>
              <td
                class="text-right"
                :class="Number(s.diff) !== 0 ? 'font-semibold text-red-600' : ''"
              >
                {{ s.diff }}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader><CardTitle>Tranzaksiya qo'shish</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-3">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex flex-col gap-1.5">
            <Label for="tx-type">Turi</Label>
            <select
              id="tx-type"
              v-model="txType"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="income">Kirim</option>
              <option value="expense">Chiqim</option>
            </select>
          </div>
          <div class="flex flex-1 flex-col gap-1.5">
            <Label for="tx-amount">Summa</Label>
            <Input id="tx-amount" v-model="txAmount" type="number" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="tx-category">Kategoriya</Label>
            <select
              id="tx-category"
              v-model="txCategoryId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="">—</option>
              <option
                v-for="category in categoriesData?.categories ?? []"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
        </div>
        <Input v-model="txComment" placeholder="Izoh (ixtiyoriy)" />
        <p v-if="txError" class="text-sm text-red-600">{{ txError }}</p>
        <Button :disabled="isSubmittingTx" class="self-start" @click="onCreateTransaction">
          {{ isSubmittingTx ? "Saqlanmoqda…" : "Saqlash" }}
        </Button>
      </CardContent>
    </Card>

    <Card v-if="otherRegisters.length > 0" class="mt-4">
      <CardHeader><CardTitle>Kassalar orasida ko'chirish</CardTitle></CardHeader>
      <CardContent class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1.5">
          <Label for="transfer-to">Qabul qiluvchi kassa</Label>
          <select
            id="transfer-to"
            v-model="transferToId"
            class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
          >
            <option value="">Tanlang</option>
            <option v-for="r in otherRegisters" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <div class="flex flex-1 flex-col gap-1.5">
          <Label for="transfer-amount">Summa</Label>
          <Input id="transfer-amount" v-model="transferAmount" type="number" />
        </div>
        <Button :disabled="isSubmittingTransfer" variant="outline" @click="onTransfer">
          {{ isSubmittingTransfer ? "Ko'chirilmoqda…" : "Ko'chirish" }}
        </Button>
        <p v-if="transferError" class="w-full text-sm text-red-600">{{ transferError }}</p>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader><CardTitle>Tranzaksiyalar</CardTitle></CardHeader>
      <CardContent>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">Sana</th>
              <th>Turi</th>
              <th>Kategoriya</th>
              <th>Izoh</th>
              <th class="text-right">Summa</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in transactionsData?.transactions ?? []"
              :key="t.id"
              class="border-b border-brand-brown/5"
            >
              <td class="py-2">{{ new Date(t.occurredAt).toLocaleDateString("uz") }}</td>
              <td>{{ TYPE_LABELS[t.type] ?? t.type }}</td>
              <td>{{ t.category?.name ?? "—" }}</td>
              <td>{{ t.comment ?? "—" }}</td>
              <td
                class="text-right"
                :class="t.type === 'income' || t.type === 'transfer_in' ? 'text-green-700' : ''"
              >
                {{ t.amount }} {{ t.currency }}
              </td>
            </tr>
            <tr v-if="(transactionsData?.transactions ?? []).length === 0">
              <td colspan="5" class="py-4 text-center text-brand-brown/50">Tranzaksiya yo'q</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
