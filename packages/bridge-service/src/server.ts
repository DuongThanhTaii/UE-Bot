import { createServer, type Server as HTTPServer } from 'http';

import compression from 'compression';
import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';

import { config } from './config';
import { ESP32Handler } from './handlers/esp32.handler';
import { errorMiddleware } from './middleware/error.middleware';
import { getHealthService } from './services/health.service';
import { logger } from './utils/logger';

export class Server {
  private app: Express;
  private httpServer: HTTPServer;
  private esp32Handler: ESP32Handler;
  private healthService = getHealthService();

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);

    // ESP32Handler quản lý WebSocket server riêng
    this.esp32Handler = new ESP32Handler({
      path: '/ws/esp32',
      server: this.httpServer,
      pingInterval: 30000,
      pingTimeout: 60000,
    });

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check - detailed status
    this.app.get('/health', async (_req: Request, res: Response) => {
      try {
        const health = await this.healthService.checkHealth();
        const statusCode =
          health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Readiness probe (Kubernetes)
    this.app.get('/ready', async (_req: Request, res: Response) => {
      try {
        const readiness = await this.healthService.checkReadiness();
        res.status(readiness.ready ? 200 : 503).json(readiness);
      } catch (_error) {
        res.status(503).json({ ready: false, error: 'Health check failed' });
      }
    });

    // Liveness probe (Kubernetes)
    this.app.get('/live', (_req: Request, res: Response) => {
      const liveness = this.healthService.checkLiveness();
      res.json(liveness);
    });

    // Simple ping endpoint
    this.app.get('/ping', (_req: Request, res: Response) => {
      res.send('pong');
    });

    // Device routes
    this.app.get('/api/devices', (_req: Request, res: Response) => {
      const devices = this.esp32Handler.getConnectedDevices();
      res.json({ devices });
    });

    this.app.get('/api/devices/:id', (req: Request, res: Response) => {
      const id = req.params['id'];
      if (!id) {
        res.status(400).json({ error: 'Missing device id' });
        return;
      }
      const device = this.esp32Handler.getDevice(id);
      if (!device) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }
      res.json({ device });
    });

    // Error handler (must be last)
    this.app.use(errorMiddleware);
  }

  public start(): void {
    // Start health service periodic checks
    this.healthService.startPeriodicChecks(30000);

    this.httpServer.listen(config.PORT, config.HOST, () => {
      logger.info({ host: config.HOST, port: config.PORT }, '🚀 Bridge service started');
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.healthService.stopPeriodicChecks();
      this.esp32Handler.shutdown();
      this.httpServer.close(() => {
        logger.info('Bridge service stopped');
        resolve();
      });
    });
  }

  // Expose ESP32 handler for external services
  public getESP32Handler(): ESP32Handler {
    return this.esp32Handler;
  }
}
