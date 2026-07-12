<script setup>
import { ref } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import * as cashApi from "../api/cash.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const queryClient = useQueryClient();

const { data: registersData } = useQuery({
  queryKey: ["cash-registers"],
  queryFn: () => cashApi.listRegisters(),
});
const { data: categoriesData } = useQuery({
  queryKey: ["cash-expense-categories"],
  queryFn: () => cashApi.listExpenseCategories(),
});

const registerName = ref("");
const registerType = ref("cash");
const registerCurrency = ref("UZS");
const registerError = ref("");
const isCreatingRegister = ref(false);

/** @returns {Promise<void>} */
async function onCreateRegister() {
  registerError.value = "";
  if (!registerName.value.trim()) {
    registerError.value = "Nomini kiriting";
    return;
  }
  isCreatingRegister.value = true;
  try {
    await cashApi.createRegister({
      name: registerName.value.trim(),
      type: registerType.value,
      currency: registerCurrency.value,
    });
    registerName.value = "";
    queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
  } catch (err) {
    registerError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isCreatingRegister.value = false;
  }
}

const categoryName = ref("");
const categoryError = ref("");
const isCreatingCategory = ref(false);

/** @returns {Promise<void>} */
async function onCreateCategory() {
  categoryError.value = "";
  if (!categoryName.value.trim()) {
    categoryError.value = "Nomini kiriting";
    return;
  }
  isCreatingCategory.value = true;
  try {
    await cashApi.createExpenseCategory({ name: categoryName.value.trim() });
    categoryName.value = "";
    queryClient.invalidateQueries({ queryKey: ["cash-expense-categories"] });
  } catch (err) {
    categoryError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isCreatingCategory.value = false;
  }
}

const TYPE_LABELS = { cash: "Naqd", bank: "Bank", card: "Karta" };
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="text-2xl font-semibold text-brand-brown">Kassa</h1>

    <Card class="mt-4">
      <CardHeader><CardTitle>Kassa/hisob raqamlar</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-3">
        <div
          v-for="register in registersData?.registers ?? []"
          :key="register.id"
          class="flex items-center justify-between rounded-md border border-brand-brown/10 px-3 py-2"
        >
          <div>
            <router-link
              :to="{ name: 'cash-register-ledger', params: { id: register.id } }"
              class="font-medium text-brand-brown underline hover:text-brand-brown/70"
            >
              {{ register.name }}
            </router-link>
            <p class="text-xs text-brand-brown/60">
              {{ TYPE_LABELS[register.type] ?? register.type }} · {{ register.currency }}
              <span v-if="!register.isActive"> · faol emas</span>
            </p>
          </div>
        </div>
        <p v-if="(registersData?.registers ?? []).length === 0" class="text-sm text-brand-brown/60">
          Hali kassa yo'q
        </p>

        <div class="mt-2 flex flex-wrap items-end gap-3 border-t border-brand-brown/10 pt-3">
          <div class="flex flex-1 flex-col gap-1.5">
            <Label for="reg-name">Yangi kassa nomi</Label>
            <Input id="reg-name" v-model="registerName" placeholder="Bosh kassa" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="reg-type">Turi</Label>
            <select
              id="reg-type"
              v-model="registerType"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="cash">Naqd</option>
              <option value="bank">Bank</option>
              <option value="card">Karta</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="reg-currency">Valyuta</Label>
            <select
              id="reg-currency"
              v-model="registerCurrency"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
            >
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <Button :disabled="isCreatingRegister" @click="onCreateRegister">
            {{ isCreatingRegister ? "Saqlanmoqda…" : "Qo'shish" }}
          </Button>
        </div>
        <p v-if="registerError" class="text-sm text-red-600">{{ registerError }}</p>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader><CardTitle>Xarajat kategoriyalari</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2">
          <span
            v-for="category in categoriesData?.categories ?? []"
            :key="category.id"
            class="rounded-full bg-brand-brown/5 px-3 py-1 text-sm text-brand-brown"
          >
            {{ category.name }}
          </span>
          <span
            v-if="(categoriesData?.categories ?? []).length === 0"
            class="text-sm text-brand-brown/60"
          >
            Hali kategoriya yo'q
          </span>
        </div>
        <div class="flex items-end gap-3 border-t border-brand-brown/10 pt-3">
          <div class="flex flex-1 flex-col gap-1.5">
            <Label for="cat-name">Yangi kategoriya</Label>
            <Input id="cat-name" v-model="categoryName" placeholder="Transport" />
          </div>
          <Button :disabled="isCreatingCategory" variant="outline" @click="onCreateCategory">
            {{ isCreatingCategory ? "Saqlanmoqda…" : "Qo'shish" }}
          </Button>
        </div>
        <p v-if="categoryError" class="text-sm text-red-600">{{ categoryError }}</p>
      </CardContent>
    </Card>
  </div>
</template>
