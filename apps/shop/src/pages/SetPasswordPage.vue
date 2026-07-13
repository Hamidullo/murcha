<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { setPasswordSchema } from "@murcha/shared";
import * as authApi from "../api/auth.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const token = /** @type {string} */ (route.query.token ?? "");
const password = ref("");
const fieldErrors = ref({});
const formError = ref("");
const isSubmitting = ref(false);
const isDone = ref(false);

/** @returns {Promise<void>} */
async function onSubmit() {
  formError.value = "";
  fieldErrors.value = {};
  const parsed = setPasswordSchema.safeParse({ token, password: password.value });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors.value[issue.path[0]] = issue.message;
    return;
  }
  isSubmitting.value = true;
  try {
    await authApi.setPassword(parsed.data);
    isDone.value = true;
    setTimeout(() => router.push({ name: "login" }), 1500);
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t("setPassword.errors.unexpected");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center px-4">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <img src="/murcha-logo.svg" alt="Murcha" class="h-10 w-auto" />
        <CardTitle>{{ t("setPassword.title") }}</CardTitle>
        <CardDescription>{{ t("setPassword.subtitle") }}</CardDescription>
      </CardHeader>
      <CardContent>
        <p v-if="!token" class="text-sm text-red-600">{{ t("setPassword.invalidLink") }}</p>
        <p v-else-if="isDone" class="text-sm text-green-700">
          {{ t("setPassword.done") }}
        </p>
        <form v-else class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-1.5">
            <Label for="password">{{ t("setPassword.newPasswordLabel") }}</Label>
            <Input id="password" v-model="password" type="password" />
            <p v-if="fieldErrors.password" class="text-xs text-red-600">
              {{ fieldErrors.password }}
            </p>
          </div>
          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <Button type="submit" :disabled="isSubmitting" class="w-full">
            {{ isSubmitting ? t("setPassword.submitting") : t("setPassword.submit") }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
