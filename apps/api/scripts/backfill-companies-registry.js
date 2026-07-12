// Bir martalik operator skripti: mavjud kompaniyalarni Redis'dagi
// `murcha:companies:active` ro'yxatiga qo'shadi — kunlik qarz eslatma job'i
// (`worker.js`) shu ro'yxatni o'qiydi, yangi kompaniyalar `auth.service.js
// registerCompany()`da avtomatik qo'shiladi, lekin bu fazadan OLDIN
// ro'yxatdan o'tganlar bu skriptsiz ko'rinmaydi. Qo'lda ishga tushiriladi:
//   node apps/api/scripts/backfill-companies-registry.js

import { PrismaClient } from "@prisma/client";
import { addActiveCompany } from "../src/lib/companies-registry.js";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true } });
  for (const { id } of companies) {
    await addActiveCompany(id);
  }
  console.log(`${companies.length} ta kompaniya Redis ro'yxatiga qo'shildi.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });
