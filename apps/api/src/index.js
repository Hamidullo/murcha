import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { initSentry } from "./lib/sentry.js";

initSentry();
const app = createApp();

app.listen(env.port, () => {
  logger.info(`murcha api — http://localhost:${env.port}`);
});
