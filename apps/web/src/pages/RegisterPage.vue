<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { registerSchema } from "@murcha/shared";
import { useAuthStore } from "../stores/auth.store.js";
import { ApiError } from "../api/client.js";
import Button from "@/components/ui/button/Button.vue";
import Input from "@/components/ui/input/Input.vue";
import Label from "@/components/ui/label/Label.vue";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const fullName = ref("");
const companyName = ref("");
const phone = ref("");
const password = ref("");
const demo = ref(true);
const fieldErrors = ref({});
const formError = ref("");
const isSubmitting = ref(false);

/** @returns {Promise<void>} */
async function onSubmit() {
  formError.value = "";
  fieldErrors.value = {};

  const parsed = registerSchema.safeParse({
    fullName: fullName.value,
    companyName: companyName.value,
    phone: phone.value,
    password: password.value,
    demo: demo.value,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fieldErrors.value[issue.path[0]] = issue.message;
    }
    return;
  }

  isSubmitting.value = true;
  try {
    await authStore.register(parsed.data);
    router.push({ name: "dashboard" });
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t("register.unexpectedError");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center px-4 py-8">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <img src="/murcha-logo.svg" alt="Murcha" class="h-10 w-auto" />
        <CardTitle>{{ t("register.title") }}</CardTitle>
        <CardDescription>{{ t("register.subtitle") }}</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-1.5">
            <Label for="fullName">{{ t("register.fullNameLabel") }}</Label>
            <Input id="fullName" v-model="fullName" />
            <p v-if="fieldErrors.fullName" class="text-xs text-red-600">
              {{ fieldErrors.fullName }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="companyName">{{ t("register.companyNameLabel") }}</Label>
            <Input id="companyName" v-model="companyName" />
            <p v-if="fieldErrors.companyName" class="text-xs text-red-600">
              {{ fieldErrors.companyName }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="phone">{{ t("register.phoneLabel") }}</Label>
            <Input id="phone" v-model="phone" type="tel" placeholder="+998901234567" />
            <p v-if="fieldErrors.phone" class="text-xs text-red-600">{{ fieldErrors.phone }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="password">{{ t("register.passwordLabel") }}</Label>
            <Input id="password" v-model="password" type="password" />
            <p v-if="fieldErrors.password" class="text-xs text-red-600">
              {{ fieldErrors.password }}
            </p>
          </div>
          <label class="flex items-center gap-2 text-sm text-brand-brown">
            <input v-model="demo" type="checkbox" class="h-4 w-4" />
            {{ t("register.demoLabel") }}
          </label>
          <p class="text-xs text-brand-brown/60">{{ t("register.demoHint") }}</p>
          <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
          <Button type="submit" :disabled="isSubmitting" class="w-full">
            {{ isSubmitting ? t("register.submitting") : t("register.submit") }}
          </Button>
          <router-link :to="{ name: 'login' }" class="text-center text-sm text-brand-brown/60">
            {{ t("register.loginLink") }}
          </router-link>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
