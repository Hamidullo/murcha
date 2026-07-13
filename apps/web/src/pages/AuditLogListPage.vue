<script setup>
import { ref, reactive, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import * as auditLogsApi from "../api/audit-logs.api.js";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const ENTITY_TYPE_LABELS = computed(() => ({
  order: t("auditLogs.entityTypes.order"),
  warehouse_doc: t("auditLogs.entityTypes.warehouse_doc"),
  payment: t("auditLogs.entityTypes.payment"),
  debt_movement: t("auditLogs.entityTypes.debt_movement"),
  transaction: t("auditLogs.entityTypes.transaction"),
  cash_shift: t("auditLogs.entityTypes.cash_shift"),
  company_member: t("auditLogs.entityTypes.company_member"),
}));

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
    <h1 class="text-2xl font-semibold text-brand-brown">{{ t("auditLogs.title") }}</h1>

    <Card class="mt-4">
      <CardContent class="flex flex-wrap items-end gap-3 pt-6">
        <div class="flex flex-col gap-1.5">
          <Label for="entity-type">{{ t("auditLogs.filters.entityType") }}</Label>
          <select
            id="entity-type"
            v-model="entityType"
            class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm"
          >
            <option value="">{{ t("auditLogs.filters.all") }}</option>
            <option v-for="(label, key) in ENTITY_TYPE_LABELS" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="from">{{ t("auditLogs.filters.from") }}</Label>
          <Input id="from" v-model="from" type="date" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="to">{{ t("auditLogs.filters.to") }}</Label>
          <Input id="to" v-model="to" type="date" />
        </div>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("auditLogs.tableTitle") }}</CardTitle></CardHeader
      >
      <CardContent>
        <p v-if="isLoading" class="text-sm text-brand-brown/60">{{ t("auditLogs.loading") }}</p>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-brown/10 text-left text-brand-brown/60">
              <th class="py-2">{{ t("auditLogs.table.date") }}</th>
              <th>{{ t("auditLogs.table.user") }}</th>
              <th>{{ t("auditLogs.table.action") }}</th>
              <th>{{ t("auditLogs.table.entity") }}</th>
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
                    {{ expanded[log.id] ? t("auditLogs.close") : t("auditLogs.details") }}
                  </button>
                </td>
              </tr>
              <tr v-if="expanded[log.id]" class="border-b border-brand-brown/5 bg-brand-brown/5">
                <td colspan="5" class="py-2">
                  <div class="grid grid-cols-2 gap-3 text-xs">
                    <div v-if="log.before">
                      <p class="mb-1 font-medium text-brand-brown/70">
                        {{ t("auditLogs.before") }}
                      </p>
                      <pre class="whitespace-pre-wrap">{{
                        JSON.stringify(log.before, null, 2)
                      }}</pre>
                    </div>
                    <div v-if="log.after">
                      <p class="mb-1 font-medium text-brand-brown/70">
                        {{ t("auditLogs.after") }}
                      </p>
                      <pre class="whitespace-pre-wrap">{{
                        JSON.stringify(log.after, null, 2)
                      }}</pre>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="logs.length === 0">
              <td colspan="5" class="py-4 text-center text-brand-brown/50">
                {{ t("auditLogs.empty") }}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
</template>
