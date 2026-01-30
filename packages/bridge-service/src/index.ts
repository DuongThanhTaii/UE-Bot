import { config } from './config';
import { Server } from './server';
import { logger } from './utils/logger';

const server = new Server();

// Graceful shutdown
const shutdown = (): void => {
  logger.info('Shutting down...');
  void server.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
logger.info({ env: config.NODE_ENV }, 'Starting bridge service');
server.start();
