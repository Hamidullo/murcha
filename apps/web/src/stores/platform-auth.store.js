import { defineStore } from "pinia";
import { ref, computed } from "vue";
import * as platformAuthApi from "../api/platform-auth.api.js";

/**
 * Kompaniya `auth.store.js`dan butunlay mustaqil — platform-admin hech
 * qanday kompaniyaga bog'lanmagan (`req.platformAuth`, backend). Refresh
 * token/cookie oqimi ataylab yo'q (MVP soddalashtirish, `BACKLOG.md`):
 * token faqat xotirada, sahifa yangilansa qayta kirish kerak bo'ladi —
 * super-admin panel kamdan-kam ochiladigan ekran, bu tradeoff qabul
 * qilingan.
 */
export const usePlatformAuthStore = defineStore("platform-auth", () => {
  const accessToken = ref(null);
  const user = ref(null);

  const isAuthenticated = computed(() => Boolean(accessToken.value));

  /**
   * @param {{ phone: string, password: string }} dto
   * @returns {Promise<void>}
   */
  async function login(dto) {
    const result = await platformAuthApi.login(dto);
    accessToken.value = result.accessToken;
    user.value = result.user;
  }

  function logout() {
    accessToken.value = null;
    user.value = null;
  }

  return { accessToken, user, isAuthenticated, login, logout };
});
