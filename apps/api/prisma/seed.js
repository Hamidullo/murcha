// Tizim spravochniklari: rollar, ruxsatlar, birliklar (company_id = null).
// To'liq RBAC ruxsat matritsasi Faza 1'da aniqlanadi — bu yerda boshlang'ich
// ro'yxat, `role_permissions` keyinroq kengaytiriladi.

import { PrismaClient } from "@prisma/client";
import { uuidv7 } from "uuidv7";

const prisma = new PrismaClient();

const SYSTEM_ROLES = [
  "owner",
  "warehouse_manager",
  "picker",
  "shop_operator",
  "courier",
  "accountant",
];

const PERMISSIONS = [
  "companies.manage",
  "employees.manage",
  "products.manage",
  "warehouse.manage",
  "counterparties.manage",
  "sale_points.manage",
  "orders.view",
  "orders.confirm",
  "deliveries.manage",
  "debts.view",
  "debts.manage",
  "cash.view",
  "cash.manage",
  "reports.view",
  "audit.view",
];

/** Owner'dan tashqari sklad tomoni rollariga beriladigan ruxsatlar (Faza 5/8/9). */
const ROLE_PERMISSIONS = {
  warehouse_manager: ["orders.view", "orders.confirm", "deliveries.manage", "debts.view"],
  picker: ["orders.view", "orders.confirm"],
  accountant: ["debts.view", "debts.manage", "cash.view", "cash.manage", "reports.view"],
};

const SYSTEM_UNITS = [
  { name: "dona", short: "dona" },
  { name: "kilogramm", short: "kg" },
  { name: "litr", short: "l" },
  { name: "metr", short: "m" },
  { name: "quti", short: "quti" },
  { name: "blok", short: "blok" },
];

/**
 * @returns {Promise<void>}
 */
async function main() {
  const roles = {};
  for (const name of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { id: idFor("role", name) },
      update: {},
      create: { id: idFor("role", name), companyId: null, name, isSystem: true },
    });
    roles[name] = role;
  }

  const permissions = {};
  for (const code of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { id: uuidv7(), code },
    });
    permissions[code] = permission;
  }

  // owner — hammasiga ruxsat
  for (const permission of Object.values(permissions)) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: roles.owner.id, permissionId: permission.id },
      },
      update: {},
      create: { roleId: roles.owner.id, permissionId: permission.id },
    });
  }

  // boshqa rollar — cheklangan ruxsat matritsasi (ROLE_PERMISSIONS)
  for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS)) {
    for (const code of codes) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: roles[roleName].id, permissionId: permissions[code].id },
        },
        update: {},
        create: { roleId: roles[roleName].id, permissionId: permissions[code].id },
      });
    }
  }

  for (const unit of SYSTEM_UNITS) {
    await prisma.unit.upsert({
      where: { id: idFor("unit", unit.short) },
      update: {},
      create: { id: idFor("unit", unit.short), companyId: null, ...unit },
    });
  }

  console.log("Seed tugadi: rollar, ruxsatlar, birliklar tayyor.");
}

/**
 * Deterministik "seed" ID — takroriy ishga tushirishda upsert bir xil qatorni topsin.
 * Haqiqiy biznes yozuvlar uchun har doim `uuidv7()` ishlatiladi, faqat seed
 * spravochniklari uchun barqaror ID kerak.
 * @param {string} kind - spravochnik turi (masalan "role")
 * @param {string} key - barqaror kalit (masalan rol nomi)
 * @returns {string} deterministik UUID
 */
function idFor(kind, key) {
  const base = "00000000-0000-7000-8000-000000000000".split("");
  const hash = `${kind}:${key}`
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const hex = hash.toString(16).padStart(12, "0").slice(0, 12);
  for (let i = 0; i < 12; i++) base[24 + i] = hex[i];
  return base.join("");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
