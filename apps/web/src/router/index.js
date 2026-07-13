import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.store.js";
import { usePlatformAuthStore } from "../stores/platform-auth.store.js";

const routes = [
  {
    path: "/login",
    name: "login",
    component: () => import("../pages/LoginPage.vue"),
    meta: { public: true },
  },
  {
    path: "/register",
    name: "register",
    component: () => import("../pages/RegisterPage.vue"),
    meta: { public: true },
  },
  {
    path: "/select-company",
    name: "select-company",
    component: () => import("../pages/SelectCompanyPage.vue"),
    meta: { public: true },
  },
  {
    path: "/forgot-password",
    name: "forgot-password",
    component: () => import("../pages/ForgotPasswordPage.vue"),
    meta: { public: true },
  },
  {
    path: "/set-password",
    name: "set-password",
    component: () => import("../pages/SetPasswordPage.vue"),
    meta: { public: true },
  },
  {
    path: "/platform/login",
    name: "platform-login",
    component: () => import("../pages/PlatformLoginPage.vue"),
    meta: { platformPublic: true },
  },
  {
    path: "/platform",
    component: () => import("../layouts/PlatformLayout.vue"),
    meta: { platform: true },
    children: [
      {
        path: "",
        redirect: { name: "platform-companies" },
      },
      {
        path: "companies",
        name: "platform-companies",
        component: () => import("../pages/PlatformCompaniesPage.vue"),
      },
    ],
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
      {
        path: "warehouse-docs",
        name: "warehouse-docs",
        component: () => import("../pages/WarehouseDocListPage.vue"),
      },
      {
        path: "warehouse-docs/new",
        name: "warehouse-doc-new",
        component: () => import("../pages/WarehouseDocFormPage.vue"),
      },
      {
        path: "warehouse-docs/:id",
        name: "warehouse-doc-edit",
        component: () => import("../pages/WarehouseDocFormPage.vue"),
      },
      {
        path: "barcode-scan",
        name: "barcode-scan",
        component: () => import("../pages/BarcodeScanPage.vue"),
      },
      {
        path: "inventory-counts",
        name: "inventory-counts",
        component: () => import("../pages/InventoryCountListPage.vue"),
      },
      {
        path: "inventory-counts/new",
        name: "inventory-count-new",
        component: () => import("../pages/InventoryCountNewPage.vue"),
      },
      {
        path: "inventory-counts/:id",
        name: "inventory-count-detail",
        component: () => import("../pages/InventoryCountDetailPage.vue"),
      },
      {
        path: "warehouses",
        name: "warehouses",
        component: () => import("../pages/WarehouseListPage.vue"),
      },
      {
        path: "sale-points",
        name: "sale-points",
        component: () => import("../pages/SalePointListPage.vue"),
      },
      {
        path: "sale-points/new",
        name: "sale-point-new",
        component: () => import("../pages/SalePointFormPage.vue"),
      },
      {
        path: "sale-points/:id",
        name: "sale-point-edit",
        component: () => import("../pages/SalePointFormPage.vue"),
      },
      {
        path: "orders",
        name: "orders",
        component: () => import("../pages/OrderListPage.vue"),
      },
      {
        path: "orders/:id",
        name: "order-detail",
        component: () => import("../pages/OrderDetailPage.vue"),
      },
      {
        path: "employees",
        name: "employees",
        component: () => import("../pages/EmployeeListPage.vue"),
      },
      {
        path: "employees/new",
        name: "employee-new",
        component: () => import("../pages/EmployeeFormPage.vue"),
      },
      {
        path: "employees/:id",
        name: "employee-edit",
        component: () => import("../pages/EmployeeFormPage.vue"),
      },
      {
        path: "roles",
        name: "roles",
        component: () => import("../pages/RoleListPage.vue"),
      },
      {
        path: "roles/:id/permissions",
        name: "role-permissions",
        component: () => import("../pages/RolePermissionsPage.vue"),
      },
      {
        path: "deliveries",
        name: "deliveries",
        component: () => import("../pages/DeliveryListPage.vue"),
      },
      {
        path: "deliveries/new",
        name: "delivery-new",
        component: () => import("../pages/DeliveryFormPage.vue"),
      },
      {
        path: "deliveries/:id",
        name: "delivery-detail",
        component: () => import("../pages/DeliveryDetailPage.vue"),
      },
      {
        path: "deliveries-map",
        name: "delivery-map",
        component: () => import("../pages/DeliveryMapPage.vue"),
      },
      {
        path: "courier",
        name: "courier-deliveries",
        component: () => import("../pages/CourierDeliveriesPage.vue"),
      },
      {
        path: "courier/:deliveryId/:orderId",
        name: "courier-delivery-detail",
        component: () => import("../pages/CourierDeliveryDetailPage.vue"),
      },
      {
        path: "counterparties/:id/statement",
        name: "counterparty-statement",
        component: () => import("../pages/CounterpartyStatementPage.vue"),
      },
      {
        path: "debts/aging",
        name: "debts-aging",
        component: () => import("../pages/DebtsAgingPage.vue"),
      },
      {
        path: "cash",
        name: "cash-registers",
        component: () => import("../pages/CashRegistersPage.vue"),
      },
      {
        path: "cash/registers/:id",
        name: "cash-register-ledger",
        component: () => import("../pages/CashRegisterLedgerPage.vue"),
      },
      {
        path: "company/settings",
        name: "company-settings",
        component: () => import("../pages/CompanySettingsPage.vue"),
      },
      {
        path: "dashboard",
        name: "dashboard",
        component: () => import("../pages/DashboardPage.vue"),
      },
      {
        path: "reports/sales",
        name: "reports-sales",
        component: () => import("../pages/SalesReportPage.vue"),
      },
      {
        path: "reports/products",
        name: "reports-products",
        component: () => import("../pages/ProductsReportPage.vue"),
      },
      {
        path: "reports/stock-turnover",
        name: "reports-stock-turnover",
        component: () => import("../pages/StockTurnoverPage.vue"),
      },
      {
        path: "audit-logs",
        name: "audit-logs",
        component: () => import("../pages/AuditLogListPage.vue"),
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
  // Platform-admin — kompaniya auth'idan butunlay mustaqil filial
  // (`platform-auth.store.js`), qolgan guard mantig'iga aralashmaydi.
  if (to.meta.platform || to.meta.platformPublic) {
    const platformAuthStore = usePlatformAuthStore();
    if (to.meta.platformPublic) {
      return platformAuthStore.isAuthenticated ? { name: "platform-companies" } : true;
    }
    return platformAuthStore.isAuthenticated ? true : { name: "platform-login" };
  }

  const authStore = useAuthStore();

  if (to.name === "select-company") {
    return authStore.pendingToken ? true : { name: "login" };
  }
  if (to.meta.public) {
    return authStore.isAuthenticated ? { name: "products" } : true;
  }
  return authStore.isAuthenticated ? true : { name: "login" };
});
