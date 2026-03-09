import { config } from './config';
import { Server } from './server';
import { getAgentService } from './services/agent.service';
import { getGatewayService } from './services/gateway.service';
import { VoicePipeline } from './services/voice-pipeline';
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

async function bootstrap(): Promise<void> {
  // Initialize agent service (if GROQ_API_KEY is set)
  const agentService = getAgentService();
  try {
    await agentService.initialize();
  } catch (err) {
    logger.warn({ err }, 'Agent service initialization failed');
  }

  // Start gateway service
  try {
    await gatewayService.start();
    logger.info('Gateway service connected');
  } catch (err) {
    logger.warn({ err }, 'Gateway service failed to connect');
  }

  // Start HTTP + WebSocket server
  server.start();

  // Start voice pipeline (wires ESP32 audio → STT → Agent → TTS → ESP32)
  if (agentService.isAvailable()) {
    const pipeline = new VoicePipeline({
      esp32Handler: server.getESP32Handler(),
    });
    pipeline.start();
    logger.info('Voice pipeline enabled');
  } else {
    logger.warn('Voice pipeline disabled (GROQ_API_KEY not set)');
  }
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start bridge service');
  process.exit(1);
});
