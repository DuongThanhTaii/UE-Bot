import { Server } from "./server";
import { logger } from "./utils/logger";
import { config } from "./config";

const server = new Server();

// Graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down...");
  await server.stop();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start server
logger.info({ env: config.NODE_ENV }, "Starting bridge service");
server.start();
