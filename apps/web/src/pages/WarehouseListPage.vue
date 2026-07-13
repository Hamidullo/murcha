<script setup>
import { ref, computed } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import { createWarehouseSchema } from "@murcha/shared";
import * as warehousesApi from "../api/warehouses.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const { t } = useI18n();
const queryClient = useQueryClient();

const {
  data: warehousesData,
  isLoading,
  isError,
} = useQuery({
  queryKey: ["warehouses"],
  queryFn: warehousesApi.listWarehouses,
});
const warehouses = computed(() => warehousesData.value?.warehouses ?? []);

const name = ref("");
const address = ref("");
const fieldErrors = ref({});
const formError = ref("");
const isCreating = ref(false);

/** @returns {Promise<void>} */
async function onCreate() {
  formError.value = "";
  fieldErrors.value = {};

  const parsed = createWarehouseSchema.safeParse({
    name: name.value,
    address: address.value || undefined,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fieldErrors.value[issue.path[0]] = issue.message;
    }
    return;
  }

  isCreating.value = true;
  try {
    await warehousesApi.createWarehouse(parsed.data);
    queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    name.value = "";
    address.value = "";
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t("warehouses.unexpectedError");
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="text-2xl font-semibold text-brand-brown">{{ t("warehouses.title") }}</h1>

    <Card class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("warehouses.newTitle") }}</CardTitle></CardHeader
      >
      <CardContent>
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="onCreate">
          <div class="flex flex-col gap-1.5">
            <Label for="name">{{ t("warehouses.nameLabel") }}</Label>
            <Input id="name" v-model="name" class="w-56" />
            <p v-if="fieldErrors.name" class="text-xs text-red-600">{{ fieldErrors.name }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="address">{{ t("warehouses.addressLabel") }}</Label>
            <Input id="address" v-model="address" class="w-64" />
          </div>
          <Button type="submit" :disabled="isCreating">
            {{ isCreating ? t("warehouses.creating") : t("warehouses.createButton") }}
          </Button>
        </form>
        <p v-if="formError" class="mt-2 text-sm text-red-600">{{ formError }}</p>
      </CardContent>
    </Card>

    <Card class="mt-4">
      <CardHeader
        ><CardTitle>{{ t("warehouses.listTitle") }}</CardTitle></CardHeader
      >
      <CardContent>
        <p v-if="isLoading" class="text-sm text-brand-brown/60">{{ t("warehouses.loading") }}</p>
        <p v-else-if="isError" class="text-sm text-red-600">{{ t("warehouses.loadError") }}</p>
        <p v-else-if="warehouses.length === 0" class="text-sm text-brand-brown/60">
          {{ t("warehouses.empty") }}
        </p>
        <ul v-else class="flex flex-col divide-y divide-brand-brown/5">
          <li v-for="wh in warehouses" :key="wh.id" class="py-2">
            <p class="text-brand-brown">{{ wh.name }}</p>
            <p v-if="wh.address" class="text-xs text-brand-brown/60">{{ wh.address }}</p>
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>
