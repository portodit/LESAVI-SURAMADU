import app from "./app";
import { logger } from "./lib/logger";
import { ensureDefaultAdmin } from "./lib/auth";
import { startTelegramPoller } from "./lib/telegramPoller";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

ensureDefaultAdmin()
  .then(() => logger.info("Default admin user ensured"))
  .catch(err => logger.error({ err }, "Failed to ensure default admin"));

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startTelegramPoller(15000);
});
