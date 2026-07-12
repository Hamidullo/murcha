import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.store.js";

const routes = [
  {
    path: "/login",
    name: "login",
    component: () => import("../pages/LoginPage.vue"),
    meta: { public: true },
  },
  {
    path: "/select-company",
    name: "select-company",
    component: () => import("../pages/SelectCompanyPage.vue"),
    meta: { public: true },
  },
  {
    path: "/",
    component: () => import("../layouts/AppLayout.vue"),
    children: [
      {
        path: "",
        name: "products",
        component: () => import("../pages/ProductListPage.vue"),
      },
      {
        path: "products/new",
        name: "product-new",
        component: () => import("../pages/ProductFormPage.vue"),
      },
      {
        path: "products/:id/edit",
        name: "product-edit",
        component: () => import("../pages/ProductFormPage.vue"),
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * RBAC middleware darajasida (backend) — bu guard faqat UX uchun
 * (CLAUDE.md: "frontend'dagi yashirish faqat UX uchun").
 */
router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.name === "select-company") {
    return authStore.pendingToken ? true : { name: "login" };
  }
  if (to.meta.public) {
    return authStore.isAuthenticated ? { name: "products" } : true;
  }
  return authStore.isAuthenticated ? true : { name: "login" };
});
