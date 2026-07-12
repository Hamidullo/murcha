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
    component: () => import("../layouts/ShopLayout.vue"),
    children: [
      {
        path: "",
        name: "home",
        component: () => import("../pages/CatalogPage.vue"),
      },
      {
        path: "cart",
        name: "cart",
        component: () => import("../pages/CartPage.vue"),
      },
      {
        path: "orders",
        name: "orders",
        component: () => import("../pages/OrdersListPage.vue"),
      },
      {
        path: "orders/:id",
        name: "order-detail",
        component: () => import("../pages/OrderDetailPage.vue"),
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
    return authStore.isAuthenticated ? { name: "home" } : true;
  }
  return authStore.isAuthenticated ? true : { name: "login" };
});
