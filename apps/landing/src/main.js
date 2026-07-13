import { ViteSSG } from "vite-ssg";
import { createI18n } from "vue-i18n";
import App from "./App.vue";
import { routes } from "./routes.js";
import { messages } from "./i18n/index.js";
import "./style.css";

/**
 * `export const createApp` — vite-ssg talabi (oddiy `createApp(App).mount()`
 * o'rniga), build vaqtida har route serverda render qilinadi (statik HTML,
 * Googlebot uchun JS shart emas). `apps/web`da hali yo'q `vue-i18n` shu
 * yerda birinchi marta ulanadi — faqat landing uchun (uz/ru), `apps/web`/
 * `apps/shop`ning to'liq lokalizatsiyasi Faza 12 qamrovi.
 */
export const createApp = ViteSSG(App, { routes }, ({ app }) => {
  const i18n = createI18n({
    legacy: false,
    locale: "uz",
    fallbackLocale: "uz",
    messages,
  });
  app.use(i18n);
});
