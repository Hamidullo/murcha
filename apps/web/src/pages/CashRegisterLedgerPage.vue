<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import * as cashApi from "../api/cash.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const { t } = useI18n();
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
    txError.value = t("cashRegisterLedger.transaction.errors.amountRequired");
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
    txError.value =
      err instanceof ApiError ? err.message : t("cashRegisterLedger.transaction.errors.unexpected");
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
    transferError.value = t("cashRegisterLedger.transfer.errors.required");
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
    transferError.value =
      err instanceof ApiError ? err.message : t("cashRegisterLedger.transfer.errors.unexpected");
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
    shiftError.value =
      err instanceof ApiError ? err.message : t("cashRegisterLedger.shift.errors.unexpected");
  } finally {
    isSubmittingShift.value = false;
  }
}

/** @returns {Promise<void>} */
async function onCloseShift() {
  shiftError.value = "";
  if (countedBalance.value === "") {
    shiftError.value = t("cashRegisterLedger.shift.errors.countedRequired");
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
    shiftError.value =
      err instanceof ApiError ? err.message : t("cashRegisterLedger.shift.errors.unexpected");
  } finally {
    isSubmittingShift.value = false;
  }
}

const TYPE_LABELS = computed(() => ({
  income: t("cashRegisterLedger.types.income"),
  expense: t("cashRegisterLedger.types.expense"),
  transfer_in: t("cashRegisterLedger.types.transfer_in"),
  transfer_out: t("cashRegisterLedger.types.transfer_out"),
}));
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="text-2xl font-semibold text-brand-brown">
      {{ register?.name ?? t("cashRegisterLedger.titleFallback") }}
    </h1>

    <Card class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("cashRegisterLedger.shift.cardTitle") }}</CardTitle></CardHeader
      >
      <CardContent class="flex flex-col gap-3">
        <div v-if="openShiftRecord" class="flex flex-col gap-3">
          <p class="text-sm text-brand-brown/70">
            {{
              t("cashRegisterLedger.shift.openInfo", {
                balance: openShiftRecord.openingBalance,
                currency: register?.currency,
              })
            }}
          </p>
          <div class="flex items-end gap-3">
            <div class="flex flex-1 flex-col gap-1.5">
              <Label for="counted">{{ t("cashRegisterLedger.shift.countedLabel") }}</Label>
              <Input id="counted" v-model="countedBalance" type="number" />
            </div>
            <Button :disabled="isSubmittingShift" @click="onCloseShift">
              {{
                isSubmittingShift
                  ? t("cashRegisterLedger.shift.closing")
                  : t("cashRegisterLedger.shift.close")
              }}
            </Button>
          </div>
        </div>
        <div v-else class="flex items-end gap-3">
          <div class="flex flex-1 flex-col gap-1.5">
            <Label for="opening">{{ t("cashRegisterLedger.shift.openingLabel") }}</Label>
            <Input id="opening" v-model="openingBalance" type="number" />
          </div>
          <Button :disabled="isSubmittingShift" variant="outline" @click="onOpenShift">
            {{
              isSubmittingShift
                ? t("cashRegisterLedger.shift.opening")
                : t("cashRegisterLedger.shift.open")
            }}
          </Button>
        </div>
        <p v-if="shiftError" class="text-sm text-red-600">{{ shiftError }}</p>

        <table
          v-if="(shiftsData?.shifts ?? []).some((s) => s.closedAt)"
          class="mt-2 w-full text-sm"
        >
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">{{ t("cashRegisterLedger.shift.columns.closedAt") }}</th>
              <th class="text-right">{{ t("cashRegisterLedger.shift.columns.expected") }}</th>
              <th class="text-right">{{ t("cashRegisterLedger.shift.columns.counted") }}</th>
              <th class="text-right">{{ t("cashRegisterLedger.shift.columns.diff") }}</th>
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
      <CardHeader
        ><CardTitle>{{ t("cashRegisterLedger.transaction.cardTitle") }}</CardTitle></CardHeader
      >
      <CardContent class="flex flex-col gap-3">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex flex-col gap-1.5">
            <Label for="tx-type">{{ t("cashRegisterLedger.transaction.typeLabel") }}</Label>
            <select
              id="tx-type"
              v-model="txType"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="income">{{ t("cashRegisterLedger.types.income") }}</option>
              <option value="expense">{{ t("cashRegisterLedger.types.expense") }}</option>
            </select>
          </div>
          <div class="flex flex-1 flex-col gap-1.5">
            <Label for="tx-amount">{{ t("cashRegisterLedger.transaction.amountLabel") }}</Label>
            <Input id="tx-amount" v-model="txAmount" type="number" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="tx-category">{{ t("cashRegisterLedger.transaction.categoryLabel") }}</Label>
            <select
              id="tx-category"
              v-model="txCategoryId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="">{{ t("cashRegisterLedger.transaction.categoryNone") }}</option>
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
        <Input
          v-model="txComment"
          :placeholder="t('cashRegisterLedger.transaction.commentPlaceholder')"
        />
        <p v-if="txError" class="text-sm text-red-600">{{ txError }}</p>
        <Button :disabled="isSubmittingTx" class="self-start" @click="onCreateTransaction">
          {{
            isSubmittingTx
              ? t("cashRegisterLedger.transaction.saving")
              : t("cashRegisterLedger.transaction.save")
          }}
        </Button>
      </CardContent>
    </Card>

    <Card v-if="otherRegisters.length > 0" class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("cashRegisterLedger.transfer.cardTitle") }}</CardTitle></CardHeader
      >
      <CardContent class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1.5">
          <Label for="transfer-to">{{ t("cashRegisterLedger.transfer.toLabel") }}</Label>
          <select
            id="transfer-to"
            v-model="transferToId"
            class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
          >
            <option value="">{{ t("cashRegisterLedger.transfer.selectPlaceholder") }}</option>
            <option v-for="r in otherRegisters" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <div class="flex flex-1 flex-col gap-1.5">
          <Label for="transfer-amount">{{ t("cashRegisterLedger.transfer.amountLabel") }}</Label>
          <Input id="transfer-amount" v-model="transferAmount" type="number" />
        </div>
        <Button :disabled="isSubmittingTransfer" variant="outline" @click="onTransfer">
          {{
            isSubmittingTransfer
              ? t("cashRegisterLedger.transfer.submitting")
              : t("cashRegisterLedger.transfer.submit")
          }}
        </Button>
        <p v-if="transferError" class="w-full text-sm text-red-600">{{ transferError }}</p>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("cashRegisterLedger.list.cardTitle") }}</CardTitle></CardHeader
      >
      <CardContent>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">{{ t("cashRegisterLedger.list.columns.date") }}</th>
              <th>{{ t("cashRegisterLedger.list.columns.type") }}</th>
              <th>{{ t("cashRegisterLedger.list.columns.category") }}</th>
              <th>{{ t("cashRegisterLedger.list.columns.comment") }}</th>
              <th class="text-right">{{ t("cashRegisterLedger.list.columns.amount") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tx in transactionsData?.transactions ?? []"
              :key="tx.id"
              class="border-b border-brand-brown/5"
            >
              <td class="py-2">{{ new Date(tx.occurredAt).toLocaleDateString("uz") }}</td>
              <td>{{ TYPE_LABELS[tx.type] ?? tx.type }}</td>
              <td>{{ tx.category?.name ?? "—" }}</td>
              <td>{{ tx.comment ?? "—" }}</td>
              <td
                class="text-right"
                :class="tx.type === 'income' || tx.type === 'transfer_in' ? 'text-green-700' : ''"
              >
                {{ tx.amount }} {{ tx.currency }}
              </td>
            </tr>
            <tr v-if="(transactionsData?.transactions ?? []).length === 0">
              <td colspan="5" class="py-4 text-center text-brand-brown/50">
                {{ t("cashRegisterLedger.list.empty") }}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
