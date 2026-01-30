import express, {
  type Express,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer, type Server as HTTPServer } from "http";
import { WebSocketServer, type WebSocket } from "ws";

import { config } from "./config";
import { logger } from "./utils/logger";
import { errorMiddleware } from "./middleware/error.middleware";
import { ESP32Handler } from "./handlers/esp32.handler";

export class Server {
  private app: Express;
  private httpServer: HTTPServer;
  private wss: WebSocketServer;
  private esp32Handler: ESP32Handler;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: "/ws/esp32",
    });
    this.esp32Handler = new ESP32Handler();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/health", (_req: Request, res: Response) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "@ue-bot/bridge-service",
        uptime: process.uptime(),
      });
    });

    // Device routes
    this.app.get("/api/devices", (_req: Request, res: Response) => {
      const devices = this.esp32Handler.getConnectedDevices();
      res.json({ devices });
    });

    this.app.get("/api/devices/:id", (req: Request, res: Response) => {
      const id = req.params["id"];
      if (!id) {
        res.status(400).json({ error: "Missing device id" });
        return;
      }
      const device = this.esp32Handler.getDevice(id);
      if (!device) {
        res.status(404).json({ error: "Device not found" });
        return;
      }
      res.json({ device });
    });

    // Error handler (must be last)
    this.app.use(errorMiddleware);
  }

  private setupWebSocket(): void {
    this.wss.on("connection", (ws: WebSocket, req) => {
      const deviceId = req.url?.split("?id=")[1] || "unknown";
      logger.info({ deviceId }, "ESP32 device connected");

      this.esp32Handler.handleConnection(ws, deviceId);

      ws.on("close", () => {
        logger.info({ deviceId }, "ESP32 device disconnected");
        this.esp32Handler.handleDisconnection(deviceId);
      });

      ws.on("error", (error) => {
        logger.error({ deviceId, error }, "WebSocket error");
      });
    });
  }

  public start(): void {
    this.httpServer.listen(config.PORT, config.HOST, () => {
      logger.info(
        { host: config.HOST, port: config.PORT },
        "🚀 Bridge service started",
      );
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close();
      this.httpServer.close(() => {
        logger.info("Bridge service stopped");
        resolve();
      });
    });
  }
}
