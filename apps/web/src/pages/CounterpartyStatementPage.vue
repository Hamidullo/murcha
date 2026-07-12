<script setup>
import { ref, computed, reactive } from "vue";
import { useRoute } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import * as debtsApi from "../api/debts.api.js";
import * as paymentsApi from "../api/payments.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const route = useRoute();
const queryClient = useQueryClient();
const counterpartyId = computed(() => route.params.id);

const from = ref("");
const to = ref("");

const { data: statement } = useQuery({
  queryKey: computed(() => ["debt-statement", counterpartyId.value, from.value, to.value]),
  queryFn: () =>
    debtsApi.getStatement(counterpartyId.value, {
      from: from.value || undefined,
      to: to.value || undefined,
    }),
});

const { data: fullStatement } = useQuery({
  queryKey: computed(() => ["debt-statement-full", counterpartyId.value]),
  queryFn: () => debtsApi.getStatement(counterpartyId.value, {}),
});

/** Har order bo'yicha ochiq qoldiq — qo'lda taqsimlash formasi uchun. */
const openOrders = computed(() => {
  const byOrder = new Map();
  for (const m of fullStatement.value?.movements ?? []) {
    if (!m.orderId) continue;
    let entry = byOrder.get(m.orderId);
    if (!entry) {
      entry = { orderId: m.orderId, orderNumber: m.orderNumber, balance: 0, dueDate: null };
      byOrder.set(m.orderId, entry);
    }
    entry.balance += m.amount;
    if (m.dueDate) entry.dueDate = m.dueDate;
  }
  return [...byOrder.values()]
    .filter((o) => o.balance > 0)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
});

const paymentAmount = ref("");
const paymentMethod = ref("cash");
const allocationMode = ref("fifo");
const manualAllocations = reactive({});
const paymentError = ref("");
const isSubmittingPayment = ref(false);

/** @returns {Promise<void>} */
async function onSubmitPayment() {
  paymentError.value = "";
  const amount = Number(paymentAmount.value);
  if (!amount || amount <= 0) {
    paymentError.value = "To'lov summasini kiriting";
    return;
  }
  const dto = {
    counterpartyId: counterpartyId.value,
    amount,
    currency: statement.value?.currency ?? "UZS",
    method: paymentMethod.value,
  };
  if (allocationMode.value === "manual") {
    dto.allocations = Object.entries(manualAllocations)
      .filter(([, value]) => Number(value) > 0)
      .map(([orderId, value]) => ({ orderId, amount: Number(value) }));
  }

  isSubmittingPayment.value = true;
  try {
    await paymentsApi.createPayment(dto);
    paymentAmount.value = "";
    for (const key of Object.keys(manualAllocations)) delete manualAllocations[key];
    queryClient.invalidateQueries({ queryKey: ["debt-statement"] });
    queryClient.invalidateQueries({ queryKey: ["debt-statement-full"] });
    queryClient.invalidateQueries({ queryKey: ["debt-balance"] });
  } catch (err) {
    paymentError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSubmittingPayment.value = false;
  }
}

/** @returns {Promise<void>} */
async function onDownloadPdf() {
  await debtsApi.downloadStatementPdf(
    counterpartyId.value,
    statement.value?.counterpartyName ?? "kontragent",
    { from: from.value || undefined, to: to.value || undefined },
  );
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="text-2xl font-semibold text-brand-brown">
      {{ statement?.counterpartyName ?? "Qarz holati" }}
    </h1>

    <Card class="mt-4">
      <CardContent class="flex flex-wrap items-end gap-3 pt-6">
        <div class="flex flex-col gap-1.5">
          <Label for="from">Dan</Label>
          <Input id="from" v-model="from" type="date" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="to">Gacha</Label>
          <Input id="to" v-model="to" type="date" />
        </div>
        <Button variant="outline" @click="onDownloadPdf">Akt sverki (PDF)</Button>
      </CardContent>
    </Card>

    <Card v-if="statement" class="mt-4">
      <CardContent class="flex items-center justify-between pt-6">
        <span class="text-sm text-brand-brown/70">Yakuniy qoldiq</span>
        <span class="text-xl font-semibold text-brand-brown">
          {{ statement.closingBalance }} {{ statement.currency }}
        </span>
      </CardContent>
    </Card>

    <Card v-if="statement" class="mt-4">
      <CardHeader><CardTitle>Harakatlar</CardTitle></CardHeader>
      <CardContent>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">Sana</th>
              <th>Turi</th>
              <th>Hujjat</th>
              <th class="text-right">Summa</th>
              <th class="text-right">Qoldiq</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in statement.movements" :key="m.id" class="border-b border-brand-brown/5">
              <td class="py-2">{{ new Date(m.createdAt).toLocaleDateString("uz") }}</td>
              <td>{{ m.type }}</td>
              <td>{{ m.orderNumber ?? "—" }}</td>
              <td class="text-right" :class="m.amount < 0 ? 'text-green-700' : ''">
                {{ m.amount > 0 ? "+" : "" }}{{ m.amount }}
              </td>
              <td class="text-right font-medium">{{ m.balance }}</td>
            </tr>
            <tr v-if="statement.movements.length === 0">
              <td colspan="5" class="py-4 text-center text-brand-brown/50">Harakatlar yo'q</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader><CardTitle>To'lov yozish</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="flex gap-3">
          <div class="flex flex-1 flex-col gap-1.5">
            <Label for="amount">Summa</Label>
            <Input id="amount" v-model="paymentAmount" type="number" />
          </div>
          <div class="flex flex-1 flex-col gap-1.5">
            <Label for="method">Usul</Label>
            <select
              id="method"
              v-model="paymentMethod"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="cash">Naqd</option>
              <option value="bank">Bank</option>
              <option value="card">Karta</option>
            </select>
          </div>
        </div>

        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-1.5">
            <input v-model="allocationMode" type="radio" value="fifo" />
            Avtomatik (eng eski qarzdan)
          </label>
          <label class="flex items-center gap-1.5">
            <input v-model="allocationMode" type="radio" value="manual" />
            Qo'lda taqsimlash
          </label>
        </div>

        <div v-if="allocationMode === 'manual'" class="flex flex-col gap-2">
          <p v-if="openOrders.length === 0" class="text-sm text-brand-brown/60">
            Ochiq qarzli zakaz yo'q
          </p>
          <div
            v-for="o in openOrders"
            :key="o.orderId"
            class="flex items-center justify-between gap-3 rounded-md border border-brand-brown/10 px-3 py-2"
          >
            <span class="text-sm text-brand-brown">
              № {{ o.orderNumber }} — ochiq: {{ o.balance }}
            </span>
            <Input
              v-model="manualAllocations[o.orderId]"
              type="number"
              class="w-32"
              placeholder="0"
            />
          </div>
        </div>

        <p v-if="paymentError" class="text-sm text-red-600">{{ paymentError }}</p>
        <Button :disabled="isSubmittingPayment" @click="onSubmitPayment">
          {{ isSubmittingPayment ? "Saqlanmoqda…" : "To'lovni saqlash" }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
