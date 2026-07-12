import { env } from "../config/env.js";
import { redis } from "./redis.js";
import { logger } from "./logger.js";

const TOKEN_KEY = "eskiz:token";
const TOKEN_TTL_SECONDS = 29 * 24 * 60 * 60;

/**
 * Eskiz.uz login token'ini oladi — Redis'da keshlanadi (~29 kun, Eskiz
 * token'lari 30 kunda tugaydi). Muddati o'tsa avtomatik qayta login qiladi.
 * @returns {Promise<string>}
 */
async function getToken() {
  const cached = await redis.get(TOKEN_KEY);
  if (cached) {
    return cached;
  }
  const res = await fetch(`${env.eskizBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.eskizEmail, password: env.eskizPassword }),
  });
  if (!res.ok) {
    throw new Error(`Eskiz login xato: ${res.status}`);
  }
  const body = await res.json();
  const token = body?.data?.token;
  if (!token) {
    throw new Error("Eskiz login javobida token yo'q");
  }
  await redis.set(TOKEN_KEY, token, "EX", TOKEN_TTL_SECONDS);
  return token;
}

/**
 * SMS yuboradi (Eskiz.uz). `ESKIZ_EMAIL`/`ESKIZ_PASSWORD` sozlanmagan bo'lsa
 * (dev-muhit) — haqiqiy so'rov yubormaydi, faqat logga yozadi (Sentry DSN'siz
 * ishlash bilan bir xil "ixtiyoriy tashqi xizmat" konvensiyasi). Xatolikda
 * ham otilmaydi — best-effort, asosiy oqim (hodim yaratish, bildirishnoma)
 * SMS yetkazilishiga bog'liq bo'lmasligi kerak.
 * @param {string} phone — E.164, masalan `+998901234567`
 * @param {string} message
 * @returns {Promise<void>}
 */
export async function sendSms(phone, message) {
  if (!env.eskizEmail || !env.eskizPassword) {
    logger.warn({ phone, message }, "SMS yuborilmadi — ESKIZ_EMAIL/ESKIZ_PASSWORD sozlanmagan");
    return;
  }
  try {
    const token = await getToken();
    const res = await fetch(`${env.eskizBaseUrl}/message/sms/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        mobile_phone: phone.replace(/^\+/, ""),
        message,
        from: env.eskizSmsFrom,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error({ phone, status: res.status, text }, "SMS yuborishda xato (Eskiz)");
    }
  } catch (err) {
    logger.error({ err, phone }, "SMS yuborishda kutilmagan xato");
  }
}
