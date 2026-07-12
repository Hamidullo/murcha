<script setup>
import { reactive, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { createInventoryCountSchema } from "@murcha/shared";
import * as inventoryCountsApi from "../api/inventory-counts.api.js";
import * as warehousesApi from "../api/warehouses.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const router = useRouter();

const { data: warehousesData } = useQuery({
  queryKey: ["warehouses"],
  queryFn: warehousesApi.listWarehouses,
});
const warehouses = computed(() => warehousesData.value?.warehouses ?? []);

const form = reactive({ warehouseId: "" });
const fieldErrors = ref({});
const formError = ref("");
const isSubmitting = ref(false);

/** @returns {Promise<void>} */
async function onSubmit() {
  formError.value = "";
  fieldErrors.value = {};

  const parsed = createInventoryCountSchema.safeParse(form);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fieldErrors.value[issue.path[0]] = issue.message;
    }
    return;
  }

  isSubmitting.value = true;
  try {
    const count = await inventoryCountsApi.createInventoryCount(parsed.data);
    router.replace({ name: "inventory-count-detail", params: { id: count.id } });
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : "Kutilmagan xato yuz berdi";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-2xl font-semibold text-brand-brown">Yangi inventarizatsiya</h1>
    <Card class="mt-4">
      <CardHeader>
        <CardTitle>Sklad tanlang</CardTitle>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-1.5">
            <Label for="warehouseId">Sklad</Label>
            <select
              id="warehouseId"
              v-model="form.warehouseId"
              class="h-10 rounded-md border border-brand-brown/20 bg-white px-3 text-sm text-brand-brown"
            >
              <option value="">Tanlang</option>
              <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                {{ warehouse.name }}
              </option>
            </select>
            <p v-if="fieldErrors.warehouseId" class="text-xs text-red-600">
              {{ fieldErrors.warehouseId }}
            </p>
          </div>

          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <Button type="submit" :disabled="isSubmitting" class="w-full">
            {{ isSubmitting ? "Boshlanmoqda…" : "Sanoqni boshlash" }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
