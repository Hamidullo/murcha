import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";

/**
 * SENTRY_DSN bo'sh bo'lsa hech narsa qilmaydi (lokal dev/CI'da shart emas) —
 * self-hosted GlitchTip ham shu DSN orqali ulanadi (CLAUDE.md/PLAN.md).
 * @returns {void}
 */
export function initSentry() {
  if (!env.sentryDsn) return;
  Sentry.init({ dsn: env.sentryDsn, environment: env.nodeEnv, tracesSampleRate: 0.1 });
}

export { Sentry };
