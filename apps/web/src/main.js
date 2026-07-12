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
app.use(VueQueryPlugin);

// Sahifa yangilanganda sessiyani httpOnly cookie orqali tiklashga urinadi
// (access token faqat xotirada — localStorage'da saqlanmaydi, XSS xavfsizligi).
const authStore = useAuthStore();
authStore.bootstrap().finally(() => {
  app.mount("#app");
});
