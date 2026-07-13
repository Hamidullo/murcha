<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { forgotPasswordSchema, resetPasswordSchema } from "@murcha/shared";
import * as authApi from "../api/auth.api.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const router = useRouter();
const { t } = useI18n();

/** @type {import("vue").Ref<"phone" | "reset">} */
const step = ref("phone");
const phone = ref("");
const code = ref("");
const password = ref("");
const fieldErrors = ref({});
const formError = ref("");
const isSubmitting = ref(false);

/** @returns {Promise<void>} */
async function onRequestCode() {
  formError.value = "";
  fieldErrors.value = {};
  const parsed = forgotPasswordSchema.safeParse({ phone: phone.value });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors.value[issue.path[0]] = issue.message;
    return;
  }
  isSubmitting.value = true;
  try {
    await authApi.forgotPassword(parsed.data);
    step.value = "reset";
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t("forgotPassword.errors.unexpected");
  } finally {
    isSubmitting.value = false;
  }
}

/** @returns {Promise<void>} */
async function onReset() {
  formError.value = "";
  fieldErrors.value = {};
  const parsed = resetPasswordSchema.safeParse({
    phone: phone.value,
    code: code.value,
    password: password.value,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors.value[issue.path[0]] = issue.message;
    return;
  }
  isSubmitting.value = true;
  try {
    await authApi.resetPassword(parsed.data);
    router.push({ name: "login" });
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t("forgotPassword.errors.unexpected");
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
        <CardTitle>{{ t("forgotPassword.title") }}</CardTitle>
        <CardDescription>
          {{
            step === "phone" ? t("forgotPassword.subtitlePhone") : t("forgotPassword.subtitleReset")
          }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form v-if="step === 'phone'" class="flex flex-col gap-4" @submit.prevent="onRequestCode">
          <div class="flex flex-col gap-1.5">
            <Label for="phone">{{ t("forgotPassword.phoneLabel") }}</Label>
            <Input id="phone" v-model="phone" type="tel" placeholder="+998901234567" />
            <p v-if="fieldErrors.phone" class="text-xs text-red-600">{{ fieldErrors.phone }}</p>
          </div>
          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <Button type="submit" :disabled="isSubmitting" class="w-full">
            {{ isSubmitting ? t("forgotPassword.submittingCode") : t("forgotPassword.submitCode") }}
          </Button>
          <router-link :to="{ name: 'login' }" class="text-center text-sm text-brand-brown/60">
            {{ t("forgotPassword.backToLogin") }}
          </router-link>
        </form>

        <form v-else class="flex flex-col gap-4" @submit.prevent="onReset">
          <div class="flex flex-col gap-1.5">
            <Label for="code">{{ t("forgotPassword.codeLabel") }}</Label>
            <Input
              id="code"
              v-model="code"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
            />
            <p v-if="fieldErrors.code" class="text-xs text-red-600">{{ fieldErrors.code }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="password">{{ t("forgotPassword.newPasswordLabel") }}</Label>
            <Input id="password" v-model="password" type="password" />
            <p v-if="fieldErrors.password" class="text-xs text-red-600">
              {{ fieldErrors.password }}
            </p>
          </div>
          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <Button type="submit" :disabled="isSubmitting" class="w-full">
            {{
              isSubmitting ? t("forgotPassword.submittingReset") : t("forgotPassword.submitReset")
            }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
