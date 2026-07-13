<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { loginSchema } from "@murcha/shared";
import { useAuthStore } from "../stores/auth.store.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const phone = ref("");
const password = ref("");
const fieldErrors = ref({});
const formError = ref("");
const isSubmitting = ref(false);

/** @returns {Promise<void>} */
async function onSubmit() {
  formError.value = "";
  fieldErrors.value = {};

  const parsed = loginSchema.safeParse({ phone: phone.value, password: password.value });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fieldErrors.value[issue.path[0]] = issue.message;
    }
    return;
  }

  isSubmitting.value = true;
  try {
    const result = await authStore.login(parsed.data);
    if (result.status === "select_company") {
      router.push({ name: "select-company" });
    } else {
      router.push({ name: "products" });
    }
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t("login.errors.unexpected");
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
        <CardTitle>{{ t("login.title") }}</CardTitle>
        <CardDescription>{{ t("login.subtitle") }}</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-1.5">
            <Label for="phone">{{ t("login.phoneLabel") }}</Label>
            <Input
              id="phone"
              v-model="phone"
              type="tel"
              :placeholder="t('login.phonePlaceholder')"
            />
            <p v-if="fieldErrors.phone" class="text-xs text-red-600">{{ fieldErrors.phone }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="password">{{ t("login.passwordLabel") }}</Label>
            <Input id="password" v-model="password" type="password" />
            <p v-if="fieldErrors.password" class="text-xs text-red-600">
              {{ fieldErrors.password }}
            </p>
          </div>
          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <Button type="submit" :disabled="isSubmitting" class="w-full">
            {{ isSubmitting ? t("login.submitting") : t("login.submit") }}
          </Button>
          <router-link
            :to="{ name: 'forgot-password' }"
            class="text-center text-sm text-brand-brown/60"
          >
            {{ t("login.forgotPasswordLink") }}
          </router-link>
          <router-link :to="{ name: 'register' }" class="text-center text-sm text-brand-brown/60">
            {{ t("login.registerLink") }}
          </router-link>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
