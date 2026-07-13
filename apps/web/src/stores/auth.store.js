import { defineStore } from "pinia";
import { ref, computed } from "vue";
import * as authApi from "../api/auth.api.js";

/**
 * Auth holati. `accessToken` faqat xotirada (bu store) — localStorage'da
 * saqlanmaydi (XSS xavfsizligi). Refresh token httpOnly cookie'da, backend
 * boshqaradi. Sahifa yangilanganda `bootstrap()` cookie orqali tiklaydi.
 */
export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref(null);
  const user = ref(null);
  const company = ref(null);
  const roleId = ref(null);
  /** Login'da bir nechta kompaniya topilsa — `/select-company` bosqichi uchun. */
  const pendingToken = ref(null);
  const pendingCompanies = ref([]);

  const isAuthenticated = computed(() => Boolean(accessToken.value));

  /**
   * @param {import("@murcha/shared").registerSchema._type & { demo?: boolean }} dto
   * @returns {Promise<void>}
   */
  async function register(dto) {
    const result = await authApi.register(dto);
    accessToken.value = result.accessToken;
    user.value = result.user;
    company.value = result.company;
  }

  /**
   * @param {{ phone: string, password: string }} dto
   * @returns {Promise<{ status: "authenticated" | "select_company" }>}
   */
  async function login(dto) {
    const result = await authApi.login(dto);
    if (result.status === "authenticated") {
      accessToken.value = result.accessToken;
      user.value = result.user;
      company.value = result.company;
    } else {
      pendingToken.value = result.pendingToken;
      pendingCompanies.value = result.companies;
    }
    return result;
  }

  /**
   * @param {string} companyId
   * @returns {Promise<void>}
   */
  async function selectCompany(companyId) {
    const result = await authApi.selectCompany({
      pendingToken: pendingToken.value,
      companyId,
    });
    accessToken.value = result.accessToken;
    user.value = result.user;
    company.value = result.company;
    pendingToken.value = null;
    pendingCompanies.value = [];
  }

  /**
   * @returns {Promise<boolean>} muvaffaqiyatli bo'lsa `true`
   */
  async function refresh() {
    try {
      const result = await authApi.refresh();
      accessToken.value = result.accessToken;
      return true;
    } catch {
      reset();
      return false;
    }
  }

  /** Sahifa yuklanganda cookie orqali sessiyani tiklashga urinadi. */
  async function bootstrap() {
    const ok = await refresh();
    if (!ok) return;
    try {
      const profile = await authApi.me();
      user.value = profile.user;
      company.value = profile.company;
      roleId.value = profile.roleId;
    } catch {
      reset();
    }
  }

  /** @returns {Promise<void>} */
  async function logout() {
    await authApi.logout().catch(() => {});
    reset();
  }

  function reset() {
    accessToken.value = null;
    user.value = null;
    company.value = null;
    roleId.value = null;
    pendingToken.value = null;
    pendingCompanies.value = [];
  }

  return {
    accessToken,
    user,
    company,
    roleId,
    pendingToken,
    pendingCompanies,
    isAuthenticated,
    register,
    login,
    selectCompany,
    refresh,
    bootstrap,
    logout,
  };
});
