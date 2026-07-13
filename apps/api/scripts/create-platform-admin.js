// Bir martalik operator skripti: platform-admin (super-admin panel)
// foydalanuvchisini yaratadi yoki mavjud foydalanuvchini shu huquq bilan
// belgilaydi. O'z-o'zidan ro'yxatdan o'tish yo'q (xavfsizlik) — shuning
// uchun qo'lda ishga tushiriladi:
//   node apps/api/scripts/create-platform-admin.js +998901234567 parolPAROL

import { PrismaClient } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

async function main() {
  const [phone, password] = process.argv.slice(2);
  if (!phone || !password) {
    console.error(
      "Ishlatilishi: node apps/api/scripts/create-platform-admin.js <phone> <password>",
    );
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { isPlatformAdmin: true } });
    console.log(`Mavjud foydalanuvchi (${phone}) platform-admin qilib belgilandi.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      id: uuidv7(),
      phone,
      passwordHash,
      fullName: "Platform admin",
      isPlatformAdmin: true,
    },
  });
  console.log(`Yangi platform-admin (${phone}) yaratildi.`);
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
