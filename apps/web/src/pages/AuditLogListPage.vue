<script setup>
import { ref, reactive, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import * as auditLogsApi from "../api/audit-logs.api.js";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ENTITY_TYPE_LABELS = {
  order: "Zakaz",
  warehouse_doc: "Sklad hujjati",
  payment: "To'lov",
  debt_movement: "Qarz tuzatish",
  transaction: "Kassa tranzaksiyasi",
  cash_shift: "Kassa smenasi",
  company_member: "Hodim",
};

const entityType = ref("");
const from = ref("");
const to = ref("");

const { data: logsData, isLoading } = useQuery({
  queryKey: computed(() => ["audit-logs", entityType.value, from.value, to.value]),
  queryFn: () =>
    auditLogsApi.listAuditLogs({
      entityType: entityType.value || undefined,
      from: from.value || undefined,
      to: to.value || undefined,
    }),
});

const logs = computed(() => logsData.value?.logs ?? []);

const expanded = reactive({});

/** @param {string} id */
function toggle(id) {
  expanded[id] = !expanded[id];
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="text-2xl font-semibold text-brand-brown">Audit log</h1>

    <Card class="mt-4">
      <CardContent class="flex flex-wrap items-end gap-3 pt-6">
        <div class="flex flex-col gap-1.5">
          <Label for="entity-type">Obyekt turi</Label>
          <select
            id="entity-type"
            v-model="entityType"
            class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
          >
            <option value="">Barchasi</option>
            <option v-for="(label, key) in ENTITY_TYPE_LABELS" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="from">Dan</Label>
          <Input id="from" v-model="from" type="date" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="to">Gacha</Label>
          <Input id="to" v-model="to" type="date" />
        </div>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader><CardTitle>Yozuvlar</CardTitle></CardHeader>
      <CardContent>
        <p v-if="isLoading" class="text-sm text-brand-brown/60">Yuklanmoqda…</p>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">Sana</th>
              <th>Foydalanuvchi</th>
              <th>Amal</th>
              <th>Obyekt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="log in logs" :key="log.id">
              <tr class="border-b border-brand-brown/5">
                <td class="py-2">{{ new Date(log.createdAt).toLocaleString("uz") }}</td>
                <td>{{ log.user?.fullName ?? "—" }}</td>
                <td>{{ log.action }}</td>
                <td>
                  {{ ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType }}
                </td>
                <td class="text-right">
                  <button
                    v-if="log.before || log.after"
                    class="text-xs text-brand-brown underline"
                    @click="toggle(log.id)"
                  >
                    {{ expanded[log.id] ? "Yopish" : "Tafsilot" }}
                  </button>
                </td>
              </tr>
              <tr v-if="expanded[log.id]" class="border-b border-brand-brown/5 bg-brand-brown/5">
                <td colspan="5" class="py-2">
                  <div class="grid grid-cols-2 gap-3 text-xs">
                    <div v-if="log.before">
                      <p class="mb-1 font-medium text-brand-brown/70">Oldin</p>
                      <pre class="whitespace-pre-wrap">{{
                        JSON.stringify(log.before, null, 2)
                      }}</pre>
                    </div>
                    <div v-if="log.after">
                      <p class="mb-1 font-medium text-brand-brown/70">Keyin</p>
                      <pre class="whitespace-pre-wrap">{{
                        JSON.stringify(log.after, null, 2)
                      }}</pre>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="logs.length === 0">
              <td colspan="5" class="py-4 text-center text-brand-brown/50">Yozuv yo'q</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
