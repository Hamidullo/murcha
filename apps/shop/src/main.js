import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";
import { router } from "./router/index.js";
import { useAuthStore } from "./stores/auth.store.js";
import "./style.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, {
  queryClientConfig: {
    // `apiFetch` (src/api/client.js) o'zi 401'da bir marta refresh+qayta
    // urinishni qiladi — TanStack Query'ning standart 3x avtomatik retry'i
    // shu bilan qo'shilib keraksiz so'rov shtormiga olib keladi.
    defaultOptions: { queries: { retry: false } },
  },
});

// Sahifa yangilanganda sessiyani httpOnly cookie orqali tiklashga urinadi
// (access token faqat xotirada — localStorage'da saqlanmaydi, XSS xavfsizligi).
const authStore = useAuthStore();
authStore.bootstrap().finally(() => {
  app.mount("#app");
});
