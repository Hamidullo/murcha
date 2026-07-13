<script setup>
import { ref, reactive, computed } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import * as platformApi from "../api/platform.api.js";
import { ApiError } from "../api/client.js";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const PLAN_LABELS = { free: "Bepul", start: "Start", business: "Biznes", corporate: "Korporativ" };
const STATUS_LABELS = { active: "Faol", expired: "Muddati tugagan", trial: "Sinov" };

const queryClient = useQueryClient();
const search = ref("");

const { data: companiesData, isLoading } = useQuery({
  queryKey: computed(() => ["platform-companies", search.value]),
  queryFn: () => platformApi.listCompanies({ search: search.value || undefined }),
});
const companies = computed(() => companiesData.value?.companies ?? []);

const expandedId = ref(null);
const form = reactive({ plan: "free", status: "trial", paidUntil: "" });
const saveError = ref("");
const isSaving = ref(false);

/** @param {object} company */
function toggle(company) {
  if (expandedId.value === company.id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = company.id;
  form.plan = company.subscription?.plan ?? "free";
  form.status = company.subscription?.status ?? "trial";
  form.paidUntil = company.subscription?.paidUntil?.slice(0, 10) ?? "";
  saveError.value = "";
}

/** @param {string} companyId */
async function onSave(companyId) {
  saveError.value = "";
  isSaving.value = true;
  try {
    await platformApi.updateSubscription(companyId, {
      plan: form.plan,
      status: form.status,
      paidUntil: form.paidUntil || null,
    });
    queryClient.invalidateQueries({ queryKey: ["platform-companies"] });
    expandedId.value = null;
  } catch (err) {
    saveError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="text-2xl font-semibold text-brand-brown">Kompaniyalar</h1>

    <Card class="mt-4">
      <CardContent class="pt-6">
        <div class="flex flex-col gap-1.5">
          <Label for="search">Qidiruv</Label>
          <Input id="search" v-model="search" placeholder="Kompaniya nomi" class="max-w-sm" />
        </div>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader><CardTitle>Ro'yxat</CardTitle></CardHeader>
      <CardContent>
        <p v-if="isLoading" class="text-sm text-brand-brown/60">Yuklanmoqda…</p>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">Nomi</th>
              <th>Tarif</th>
              <th>Holat</th>
              <th>Muddati</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="company in companies" :key="company.id">
              <tr class="border-b border-brand-brown/5">
                <td class="py-2">{{ company.name }}</td>
                <td>{{ PLAN_LABELS[company.subscription?.plan] ?? "—" }}</td>
                <td>{{ STATUS_LABELS[company.subscription?.status] ?? "—" }}</td>
                <td>{{ company.subscription?.paidUntil?.slice(0, 10) ?? "—" }}</td>
                <td class="text-right">
                  <button class="text-xs text-brand-brown underline" @click="toggle(company)">
                    {{ expandedId === company.id ? "Yopish" : "Tahrirlash" }}
                  </button>
                </td>
              </tr>
              <tr
                v-if="expandedId === company.id"
                class="border-b border-brand-brown/5 bg-brand-brown/5"
              >
                <td colspan="5" class="py-3">
                  <div class="flex flex-wrap items-end gap-3">
                    <div class="flex flex-col gap-1.5">
                      <Label :for="`plan-${company.id}`">Tarif</Label>
                      <select
                        :id="`plan-${company.id}`"
                        v-model="form.plan"
                        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
                      >
                        <option v-for="(label, key) in PLAN_LABELS" :key="key" :value="key">
                          {{ label }}
                        </option>
                      </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <Label :for="`status-${company.id}`">Holat</Label>
                      <select
                        :id="`status-${company.id}`"
                        v-model="form.status"
                        class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
                      >
                        <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">
                          {{ label }}
                        </option>
                      </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <Label :for="`paid-until-${company.id}`">To'langan muddat</Label>
                      <Input
                        :id="`paid-until-${company.id}`"
                        v-model="form.paidUntil"
                        type="date"
                      />
                    </div>
                    <Button :disabled="isSaving" @click="onSave(company.id)">
                      {{ isSaving ? "Saqlanmoqda…" : "Saqlash" }}
                    </Button>
                  </div>
                  <p v-if="saveError" class="mt-2 text-sm text-red-600">{{ saveError }}</p>
                </td>
              </tr>
            </template>
            <tr v-if="companies.length === 0">
              <td colspan="5" class="py-4 text-center text-brand-brown/50">Kompaniya topilmadi</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
