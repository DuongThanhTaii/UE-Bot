import { config } from './config';
import { Server } from './server';
import { getGatewayService } from './services/gateway.service';
import { logger } from './utils/logger';

const server = new Server();
const gatewayService = getGatewayService();

// Graceful shutdown
const shutdown = (): void => {
  logger.info('Shutting down...');
  void gatewayService.stop();
  void server.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server and gateway service
logger.info({ env: config.NODE_ENV }, 'Starting bridge service');

// Start gateway service first
gatewayService
  .start()
  .then(() => {
    logger.info('Gateway service connected');
    server.start();
  })
  .catch((err) => {
    logger.warn({ err }, 'Gateway service failed to connect, starting server anyway');
    server.start();
  });
