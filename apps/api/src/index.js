import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { initSentry } from "./lib/sentry.js";
import { ensureBucket } from "./lib/minio.js";
import { initSocket } from "./lib/socket.js";

initSentry();
const app = createApp();

ensureBucket();

const server = app.listen(env.port, () => {
  logger.info(`murcha api — http://localhost:${env.port}`);
});
initSocket(server);
