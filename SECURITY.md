# SECURITY — xavfsizlik auditi (Faza 12)

Bu hujjat Faza 12'da o'tkazilgan kod darajasidagi xavfsizlik auditini qayd etadi (OWASP Top 10 asosida code-review, avtomatlashtirilgan skaner emas). **Haqiqiy penetration test va real infratuzilma auditi bu qamrovga kirmaydi** — real server/domen/tashqi auditor talab qiladi, foydalanuvchi bilan alohida kelishiladi (PLAN.md Faza 12 "2-3 haqiqiy biznes bilan pilot" bosqichi bilan birga).

## Tuzatilgan topilmalar

- **CORS ochiq edi (`cors()` — barcha origin)**: `apps/api/src/app.js` — endi faqat `APP_WEB_URL`/`APP_SHOP_URL`/`PUBLIC_BASE_URL` (`.env`dan) oq ro'yxatga olingan, `credentials: true` bilan. Origin header bo'lmagan so'rovlar (server-to-server, bir xil-origin) bloklanmaydi.
- **`POST /auth/register` rate-limit'siz edi**: Faza 12 Task 6'da bu endpoint haqiqiy frontend forma (`RegisterPage.vue`) bilan ulandi — autentifikatsiyasiz DB yozuv (user+company+subscription) yaratadigan endpoint sifatida ommaviy soxta ro'yxatdan o'tish/resurs sarflash xavfi bor edi. IP bo'yicha 10/soat limit qo'shildi (`apps/api/src/modules/auth/auth.routes.js`).
- **`uuid@<11.1.1` (moderate, GHSA-w5hq-g745-h8pq)**: `exceljs` (apps/api export/import) transitiv bog'liqligi orqali — bufer chegara tekshiruvi yo'q zaiflik. `pnpm-workspace.yaml`da `overrides` bilan `>=11.1.1`ga majburlandi. `pnpm audit` endi 0 zaiflik ko'rsatadi. Export/import testlari (34/34) tuzatishdan keyin ham o'tadi.

## Ko'rib chiqilgan, o'zgarishsiz to'g'ri topilgan

- **Refresh token cookie** (`apps/api/src/modules/auth/auth.controller.js`): `httpOnly`, `secure` (faqat production), `sameSite: "lax"`, `path` `/api/v1/auth`ga cheklangan, `domain` `.env`dagi `COOKIE_DOMAIN`dan (prod'da `.murcha.uz` bo'lishi kerak — subdomenlar orasida umumiy sessiya). `sameSite: "lax"` `app.murcha.uz`→`api.murcha.uz` so'rovlari uchun to'g'ri ishlaydi (bir xil sayt, Public Suffix List ma'nosida).
- **Parol xeshlash**: argon2 (PLAN.md talabi bo'yicha).
- **Brute-force himoya**: login — telefon bo'yicha 5 urinishdan keyin 15 daqiqa blok (`AuthService.login()`); OTP (parolni tiklash) — telefon bo'yicha 3 noto'g'ri urinishdan keyin kod bekor qilinadi, yangi kod so'rash IP bo'yicha 5/15daq bilan cheklangan.
- **SQL in'ektsiya**: Prisma parametrlashtirilgan so'rovlar, xom SQL faqat `prisma/*.sql` migratsiya fayllarida (RLS/immutable trigger), ilova kodida yo'q.
- **XSS**: Vue shablonlarida `v-html` butun kod bazasida ishlatilmaydi (tekshirildi — 0 ta natija) — barcha chiqish standart interpolatsiya orqali avtomatik ekranlanadi. Server tomonida xom HTML qaytaradigan yagona joy — `showcase.html.js` (vitrina `GET /:slug`) — kompaniya/mahsulot nomi kabi foydalanuvchi boshqaradigan matnlarni `escapeHtml()` orqali o'tkazadi (tekshirildi, to'g'ri qo'llanilgan). `helmet()` CSP header ham qo'shimcha qavat.
- **Mass assignment**: barcha yozuv endpoint'lari Zod DTO orqali (`packages/shared/schemas`) — faqat sxemada e'lon qilingan maydonlar qabul qilinadi.
- **Multi-tenant izolatsiya**: har so'rov `withTenant`/RLS (`set_config('app.company_id', ...)`) bilan ikki qavatli himoyalangan. `withoutTenant` bir nechta joyda (auth, notifications, push-subscriptions, platform, showcase) ataylab ishlatiladi — har birida servis qatlamida `companyId`/`userId` bilan qo'lda scope qilingan (tekshirilgan). `showcase.service.js`dagi holat allaqachon `BACKLOG.md`da alohida hujjatlashtirilgan (ochiq vitrina, `company_id` slug orqali aniqlanadi, RLS ikkinchi qavati shu yo'lda yo'q).
- **CSRF**: aksariyat state-o'zgartiruvchi endpointlar `Authorization: Bearer` header talab qiladi (cookie yolg'iz yetarli emas). Faqat cookie bilan ishlaydigan ikkitasi — `/auth/refresh`, `/auth/logout` — `sameSite: "lax"` bilan himoyalangan (bu cookie cross-site fetch/XHR so'rovlariga biriktirilmaydi, faqat top-level GET navigatsiyada — klassik forma-CSRF samarasiz).

## Qamrovdan tashqari (real infratuzilma/server talab qiladi)

- Haqiqiy penetration test / avtomatlashtirilgan zaiflik skaneri (OWASP ZAP va h.k.) — real, ishga tushirilgan muhitni talab qiladi.
- WAF/DDoS himoyasi (Cloudflare va h.k.) — domen/DNS boshqaruvi kerak.
- SSL/TLS sertifikat sozlamalari sinovi (`nginx/nginx.prod.conf`, `docker-compose.prod.yml`) — yozilgan, lekin real serverda ishga tushirilmagan (Faza 12 Task 7 izohiga qarang).
- Maxfiylik/GDPR-uslubidagi ma'lumot saqlash siyosati — huquqiy ko'rib chiqish talab qiladi, kod auditi qamroviga kirmaydi.
- `POST /auth/reset-password` (OTP tasdiqlash) IP darajasida alohida rate-limit'siz — faqat telefon bo'yicha ichki urinish hisoblagichi (`MAX_OTP_ATTEMPTS`) bor. Amalda kod har chaqiruvda o'zgaradi va 3 urinishdan keyin bekor bo'ladi, shuning uchun past-xavf deb baholandi (past ustuvorlik, keyingi auditda qayta ko'riladi).

## Zaiflik haqida xabar berish

Xavfsizlik zaifligini topsangiz: support@murcha.uz.
