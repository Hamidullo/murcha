/**
 * Prod'da dev standartlari bilan ishga tushishni taqiqlaydi (Faza 13 Task 4).
 *
 * `docker-compose.prod.yml` `POSTGRES_PASSWORD`/`MINIO_ROOT_PASSWORD`ni `:?`
 * bilan majburiy qiladi, lekin `JWT_ACCESS_SECRET` `env_file` orqali keladi —
 * compose uning QIYMATINI tekshira olmaydi. `.env.example`dagi
 * `dev-only-change-me` nusxalanib qolsa, tokenlarni hamma imzolay olardi.
 * Shu sababli tekshiruv ilova darajasida.
 */
function assertProductionSecrets() {
  if ((process.env.NODE_ENV ?? "development") !== "production") return;

  const secret = process.env.JWT_ACCESS_SECRET;
  const problems = [];

  if (!secret) {
    problems.push("JWT_ACCESS_SECRET sozlanmagan");
  } else if (secret === "dev-only-change-me") {
    problems.push("JWT_ACCESS_SECRET hali .env.example dagi standart qiymatda");
  } else if (secret.length < 32) {
    problems.push(`JWT_ACCESS_SECRET juda qisqa (${secret.length} belgi, kamida 32 kerak)`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Prod konfiguratsiyasi xavfsiz emas:\n  - ${problems.join("\n  - ")}\n` +
        "Yangi kalit: openssl rand -hex 32",
    );
  }
}

assertProductionSecrets();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  sentryDsn: process.env.SENTRY_DSN,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtPlatformExpiresIn: process.env.JWT_PLATFORM_EXPIRES_IN ?? "12h",
  cookieDomain: process.env.COOKIE_DOMAIN,
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  minioEndpoint: process.env.MINIO_ENDPOINT ?? "localhost",
  minioPort: Number(process.env.MINIO_PORT ?? 9000),
  minioRootUser: process.env.MINIO_ROOT_USER,
  minioRootPassword: process.env.MINIO_ROOT_PASSWORD,
  minioBucket: process.env.MINIO_BUCKET ?? "murcha",
  eskizBaseUrl: process.env.ESKIZ_BASE_URL ?? "https://notify.eskiz.uz/api",
  eskizEmail: process.env.ESKIZ_EMAIL,
  eskizPassword: process.env.ESKIZ_PASSWORD,
  eskizSmsFrom: process.env.ESKIZ_SMS_FROM ?? "4546",
  appWebUrl: process.env.APP_WEB_URL ?? "https://app.murcha.uz",
  appShopUrl: process.env.APP_SHOP_URL ?? "https://shop.murcha.uz",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "https://murcha.uz",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:support@murcha.uz",
};
