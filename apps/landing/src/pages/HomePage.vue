<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useHead } from "@unhead/vue";

const { t, locale, tm } = useI18n();

const APP_URL = "https://app.murcha.uz";

const canonicalUrl = computed(
  () => `https://murcha.uz/${locale.value === "uz" ? "" : locale.value}`,
);

useHead({
  title: computed(() => t("meta.title")),
  meta: [
    { name: "description", content: computed(() => t("meta.description")) },
    { property: "og:type", content: "website" },
    { property: "og:title", content: computed(() => t("meta.title")) },
    { property: "og:description", content: computed(() => t("meta.description")) },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: "https://murcha.uz/murcha-logo.svg" },
  ],
  link: [{ rel: "canonical", href: canonicalUrl }],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Murcha",
        url: "https://murcha.uz",
        logo: "https://murcha.uz/murcha-logo.svg",
      }),
    },
  ],
});

const planKeys = ["free", "start", "business", "corporate"];

function toggleLocale() {
  locale.value = locale.value === "uz" ? "ru" : "uz";
}
</script>

<template>
  <div class="min-h-screen">
    <header class="flex items-center justify-between px-6 py-4 md:px-12">
      <img src="/murcha-logo.svg" alt="Murcha" class="h-8 w-auto" />
      <nav class="flex items-center gap-6 text-sm text-brand-brown/70">
        <a href="#features" class="hidden hover:text-brand-brown md:inline">
          {{ t("nav.features") }}
        </a>
        <a href="#pricing" class="hidden hover:text-brand-brown md:inline">
          {{ t("nav.pricing") }}
        </a>
        <button class="hover:text-brand-brown" @click="toggleLocale">
          {{ locale === "uz" ? "RU" : "UZ" }}
        </button>
        <a :href="`${APP_URL}/login`" class="hover:text-brand-brown">{{ t("nav.login") }}</a>
        <a
          :href="`${APP_URL}/login`"
          class="rounded-md bg-brand-amber px-4 py-2 font-medium text-white hover:opacity-90"
        >
          {{ t("nav.start") }}
        </a>
      </nav>
    </header>

    <section class="flex flex-col items-center px-6 py-20 text-center md:py-32">
      <h1 class="max-w-3xl text-4xl font-bold text-brand-brown md:text-6xl">
        {{ t("hero.title") }}
      </h1>
      <p class="mt-4 max-w-xl text-lg text-brand-brown/70 md:text-xl">
        {{ t("hero.subtitle") }}
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
        <a
          :href="`${APP_URL}/login`"
          class="rounded-md bg-brand-amber px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          {{ t("hero.cta_start") }}
        </a>
        <a
          href="#features"
          class="rounded-md border border-brand-brown/20 px-6 py-3 font-semibold text-brand-brown hover:bg-brand-brown/5"
        >
          {{ t("hero.cta_demo") }}
        </a>
      </div>
    </section>

    <section id="features" class="px-6 py-16 md:px-12">
      <h2 class="text-center text-3xl font-bold text-brand-brown">{{ t("features.title") }}</h2>
      <div class="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
        <div
          v-for="(item, i) in tm('features.items')"
          :key="i"
          class="rounded-xl border border-brand-brown/10 bg-white p-6 shadow-sm"
        >
          <h3 class="font-semibold text-brand-brown">{{ item.title }}</h3>
          <p class="mt-2 text-sm text-brand-brown/70">{{ item.desc }}</p>
        </div>
      </div>
    </section>

    <section id="pricing" class="px-6 py-16 md:px-12">
      <h2 class="text-center text-3xl font-bold text-brand-brown">{{ t("pricing.title") }}</h2>
      <p class="mx-auto mt-2 max-w-xl text-center text-brand-brown/70">
        {{ t("pricing.subtitle") }}
      </p>
      <div class="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-4">
        <div
          v-for="plan in planKeys"
          :key="plan"
          class="flex flex-col rounded-xl border border-brand-brown/10 bg-white p-6 shadow-sm"
        >
          <h3 class="font-semibold text-brand-brown">{{ t(`pricing.plans.${plan}.name`) }}</h3>
          <p class="mt-2 flex-1 text-sm text-brand-brown/70">
            {{ t(`pricing.plans.${plan}.desc`) }}
          </p>
          <a
            :href="`${APP_URL}/login`"
            class="mt-4 rounded-md border border-brand-amber px-4 py-2 text-center text-sm font-semibold text-brand-amber hover:bg-brand-amber hover:text-white"
          >
            {{ t("pricing.cta") }}
          </a>
        </div>
      </div>
    </section>

    <footer
      class="border-t border-brand-brown/10 px-6 py-8 text-center text-sm text-brand-brown/60 md:px-12"
    >
      <p class="font-medium text-brand-brown">{{ t("footer.tagline") }}</p>
      <p class="mt-1">© {{ new Date().getFullYear() }} Murcha. {{ t("footer.rights") }}</p>
    </footer>
  </div>
</template>
