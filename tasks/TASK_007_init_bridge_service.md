# TASK-007: Initialize Bridge Service

## Task Information

- **ID**: T007
- **Phase**: 1 - Foundation
- **Priority**: High
- **Estimated Hours**: 3h
- **Dependencies**: T005

---

## Objective

Khởi tạo bridge service - Node.js server kết nối ESP32 với Moltbot Gateway.

---

## Acceptance Criteria

- [ ] Express server configured
- [ ] WebSocket server for ESP32 connections
- [ ] Basic project structure
- [ ] Health endpoint working
- [ ] Dev mode with hot reload

---

## Instructions

### Step 1: Create Package Structure

```
packages/bridge-service/
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── config.ts
│   ├── handlers/
│   │   ├── index.ts
│   │   ├── esp32.handler.ts
│   │   ├── gateway.handler.ts
│   │   └── audio.handler.ts
│   ├── services/
│   │   ├── index.ts
│   │   ├── device.service.ts
│   │   ├── stt.service.ts
│   │   └── tts.service.ts
│   ├── middleware/
│   │   ├── index.ts
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── utils/
│   │   └── index.ts
│   └── types/
│       └── index.ts
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

### Step 2: Create package.json

```json
{
  "name": "@ue-bot/bridge-service",
  "version": "0.1.0",
  "private": true,
  "description": "Bridge service connecting ESP32 devices with Moltbot Gateway",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@ue-bot/shared": "workspace:*",
    "express": "^4.19.0",
    "ws": "^8.17.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "dotenv": "^16.4.0",
    "zod": "^3.23.0",
    "uuid": "^9.0.0",
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0"
  },
  "devDependencies": {
    "@types/compression": "^1.7.5",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.0.0",
    "@types/uuid": "^9.0.8",
    "@types/ws": "^8.5.10",
    "rimraf": "^5.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.11.0",
    "vitest": "^2.0.0"
  }
}
```

### Step 3: Create tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@ue-bot/shared": ["../shared/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "references": [{ "path": "../shared" }]
}
```

### Step 4: Create Configuration

#### src/config.ts

```typescript
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default("0.0.0.0"),

  // Gateway
  GATEWAY_HOST: z.string().default("127.0.0.1"),
  GATEWAY_PORT: z.coerce.number().default(18789),
  GATEWAY_TOKEN: z.string().optional(),

  // OpenAI (Whisper)
  OPENAI_API_KEY: z.string().optional(),

  // ElevenLabs
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const config = parsed.data;

export type Config = z.infer<typeof configSchema>;
```

### Step 5: Create Logger

#### src/utils/logger.ts

```typescript
import pino from "pino";

import { config } from "../config";

export const logger = pino({
  level: config.LOG_LEVEL,
  transport:
    config.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});
```

### Step 6: Create Express Server

#### src/server.ts

```typescript
import express, { type Express, type Request, type Response } from "express";
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
      const device = this.esp32Handler.getDevice(req.params.id);
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
```

### Step 7: Create ESP32 Handler

#### src/handlers/esp32.handler.ts

```typescript
import type { WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";

import type { Device, DeviceStatus, DeviceCommand } from "@ue-bot/shared";
import { logger } from "../utils/logger";

interface ConnectedDevice {
  ws: WebSocket;
  device: Device;
  lastPing: number;
}

export class ESP32Handler {
  private devices: Map<string, ConnectedDevice> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPingInterval();
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      this.devices.forEach((connected, id) => {
        if (now - connected.lastPing > 60000) {
          logger.warn({ deviceId: id }, "Device timeout, disconnecting");
          connected.ws.close();
          this.devices.delete(id);
        } else if (connected.ws.readyState === connected.ws.OPEN) {
          connected.ws.ping();
        }
      });
    }, 30000);
  }

  public handleConnection(ws: WebSocket, deviceId: string): void {
    const device: Device = {
      id: deviceId || uuidv4(),
      name: `ESP32-${deviceId.slice(-4)}`,
      macAddress: "",
      ipAddress: "",
      status: "online" as DeviceStatus,
      lastSeen: new Date(),
      firmwareVersion: "0.0.0",
      config: {
        wakeWord: "hey bot",
        language: "en",
        volume: 70,
        sensitivity: 50,
        ledEnabled: true,
        autoReconnect: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.devices.set(device.id, {
      ws,
      device,
      lastPing: Date.now(),
    });

    // Send welcome message
    this.sendMessage(device.id, {
      type: "connected",
      deviceId: device.id,
      timestamp: Date.now(),
    });

    // Handle messages
    ws.on("message", (data) => {
      this.handleMessage(device.id, data);
    });

    ws.on("pong", () => {
      const connected = this.devices.get(device.id);
      if (connected) {
        connected.lastPing = Date.now();
        connected.device.lastSeen = new Date();
      }
    });
  }

  public handleDisconnection(deviceId: string): void {
    const connected = this.devices.get(deviceId);
    if (connected) {
      connected.device.status = "offline";
      this.devices.delete(deviceId);
    }
  }

  private handleMessage(deviceId: string, data: unknown): void {
    try {
      const message = JSON.parse(data as string);
      logger.debug({ deviceId, message }, "Received message from ESP32");

      switch (message.type) {
        case "audio":
          this.handleAudioData(deviceId, message.data);
          break;
        case "status":
          this.handleStatusUpdate(deviceId, message.data);
          break;
        case "config":
          this.handleConfigUpdate(deviceId, message.data);
          break;
        default:
          logger.warn({ deviceId, type: message.type }, "Unknown message type");
      }
    } catch (error) {
      logger.error({ deviceId, error }, "Failed to parse message");
    }
  }

  private handleAudioData(deviceId: string, audioData: unknown): void {
    logger.debug(
      { deviceId, size: (audioData as Buffer).length },
      "Received audio data",
    );
    // TODO: Process audio with STT service
  }

  private handleStatusUpdate(deviceId: string, status: Partial<Device>): void {
    const connected = this.devices.get(deviceId);
    if (connected) {
      Object.assign(connected.device, status);
      connected.device.updatedAt = new Date();
    }
  }

  private handleConfigUpdate(deviceId: string, config: unknown): void {
    const connected = this.devices.get(deviceId);
    if (connected) {
      Object.assign(connected.device.config, config);
      connected.device.updatedAt = new Date();
    }
  }

  public sendMessage(deviceId: string, message: unknown): boolean {
    const connected = this.devices.get(deviceId);
    if (!connected || connected.ws.readyState !== connected.ws.OPEN) {
      return false;
    }

    connected.ws.send(JSON.stringify(message));
    return true;
  }

  public sendCommand(command: DeviceCommand): boolean {
    return this.sendMessage(command.deviceId, {
      type: "command",
      command: command.command,
      payload: command.payload,
      timestamp: Date.now(),
    });
  }

  public getConnectedDevices(): Device[] {
    return Array.from(this.devices.values()).map((c) => c.device);
  }

  public getDevice(id: string): Device | undefined {
    return this.devices.get(id)?.device;
  }

  public destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.devices.forEach((connected) => {
      connected.ws.close();
    });
    this.devices.clear();
  }
}
```

### Step 8: Create Error Middleware

#### src/middleware/error.middleware.ts

```typescript
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import { logger } from "../utils/logger";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error({ err }, "Unhandled error");

  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.errors,
    });
    return;
  }

  // Known error with status code
  if (err.statusCode) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Unknown error
  res.status(500).json({
    error: "Internal server error",
  });
}
```

### Step 9: Create Entry Point

#### src/index.ts

```typescript
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
```

### Step 10: Create Dockerfile

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY packages/bridge-service ./packages/bridge-service

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm --filter @ue-bot/shared build
RUN pnpm --filter @ue-bot/bridge-service build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/packages/bridge-service/dist ./dist
COPY --from=builder /app/packages/bridge-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

### Step 11: Create README.md

````markdown
# @ue-bot/bridge-service

Bridge service that connects ESP32 devices with Moltbot Gateway.

## Features

- WebSocket server for ESP32 connections
- Audio streaming support
- Device management
- STT/TTS integration

## Development

```bash
# Start dev server (with hot reload)
pnpm dev

# Build
pnpm build

# Start production
pnpm start
```
````

## API Endpoints

- `GET /health` - Health check
- `GET /api/devices` - List connected devices
- `GET /api/devices/:id` - Get device details

## WebSocket

- Connect: `ws://localhost:8080/ws/esp32?id=<device-id>`
- Messages are JSON formatted

## Environment Variables

See `.env.example` in project root.

````

---

## Verification Checklist
- [ ] `pnpm dev` starts server without errors
- [ ] Health endpoint at http://localhost:8080/health works
- [ ] WebSocket accepts connections at ws://localhost:8080/ws/esp32
- [ ] No TypeScript errors
- [ ] Docker build succeeds

---

## Git Commit
```bash
git add .
git commit -m "feat(bridge): initialize bridge service [T007]"
git push
````

---

## Notes

- Pino logger được sử dụng cho production-ready logging
- WebSocket path: /ws/esp32
- Device management in-memory (có thể mở rộng với database)
