# TASK-005: Create Shared Package

## Task Information

- **ID**: T005
- **Phase**: 1 - Foundation
- **Priority**: High
- **Estimated Hours**: 3h
- **Dependencies**: T003, T004

---

## Objective

Tạo shared package chứa types, utilities, và constants được sử dụng chung giữa các packages.

---

## Acceptance Criteria

- [ ] Package @ue-bot/shared được tạo
- [ ] Types cho device, audio, gateway exported
- [ ] Utility functions implemented
- [ ] Constants defined
- [ ] Build script working

---

## Instructions

### Step 1: Create Package Structure

```
packages/shared/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── common.ts
│   │   ├── device.ts
│   │   ├── audio.ts
│   │   └── gateway.ts
│   ├── utils/
│   │   ├── index.ts
│   │   ├── validation.ts
│   │   ├── logger.ts
│   │   └── helpers.ts
│   └── constants/
│       ├── index.ts
│       ├── audio.ts
│       └── device.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Step 2: Create package.json

```json
{
  "name": "@ue-bot/shared",
  "version": "0.1.0",
  "private": true,
  "description": "Shared types and utilities for UE-Bot",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.mjs",
      "require": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils/index.mjs",
      "require": "./dist/utils/index.js",
      "types": "./dist/utils/index.d.ts"
    },
    "./constants": {
      "import": "./dist/constants/index.mjs",
      "require": "./dist/constants/index.js",
      "types": "./dist/constants/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "clean": "rimraf dist",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "rimraf": "^5.0.0",
    "tsup": "^8.0.0",
    "vitest": "^2.0.0"
  }
}
```

### Step 3: Create tsup.config.ts

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "types/index": "src/types/index.ts",
    "utils/index": "src/utils/index.ts",
    "constants/index": "src/constants/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
});
```

### Step 4: Create Type Files

#### src/types/common.ts

```typescript
import { z } from "zod";

// ============ Result Types ============
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// ============ Utility Types ============
export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// ============ Event Types ============
export interface BaseEvent {
  type: string;
  timestamp: number;
  source: string;
}

// ============ Zod Schemas ============
export const TimestampedSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const BaseEventSchema = z.object({
  type: z.string(),
  timestamp: z.number(),
  source: z.string(),
});
```

#### src/types/device.ts

```typescript
import { z } from "zod";

import type { Timestamped } from "./common";

// ============ Enums ============
export const DeviceStatus = {
  ONLINE: "online",
  OFFLINE: "offline",
  ERROR: "error",
  CONNECTING: "connecting",
} as const;

export type DeviceStatus = (typeof DeviceStatus)[keyof typeof DeviceStatus];

// ============ Interfaces ============
export interface DeviceConfig {
  wakeWord: string;
  language: string;
  volume: number;
  sensitivity: number;
  ledEnabled: boolean;
  autoReconnect: boolean;
}

export interface Device extends Timestamped {
  id: string;
  name: string;
  macAddress: string;
  ipAddress: string;
  status: DeviceStatus;
  lastSeen: Date;
  firmwareVersion: string;
  config: DeviceConfig;
}

export interface DeviceCommand {
  deviceId: string;
  command: "start" | "stop" | "status" | "config" | "restart" | "ota";
  payload?: Record<string, unknown>;
}

export interface DeviceEvent {
  type: "connected" | "disconnected" | "error" | "audio" | "command";
  deviceId: string;
  timestamp: number;
  data?: unknown;
}

// ============ Zod Schemas ============
export const DeviceConfigSchema = z.object({
  wakeWord: z.string().min(1).max(50),
  language: z.string().length(2),
  volume: z.number().min(0).max(100),
  sensitivity: z.number().min(0).max(100),
  ledEnabled: z.boolean(),
  autoReconnect: z.boolean(),
});

export const DeviceCommandSchema = z.object({
  deviceId: z.string().uuid(),
  command: z.enum(["start", "stop", "status", "config", "restart", "ota"]),
  payload: z.record(z.unknown()).optional(),
});

export const DeviceEventSchema = z.object({
  type: z.enum(["connected", "disconnected", "error", "audio", "command"]),
  deviceId: z.string(),
  timestamp: z.number(),
  data: z.unknown().optional(),
});
```

#### src/types/audio.ts

```typescript
import { z } from "zod";

// ============ Enums ============
export const AudioEncoding = {
  PCM: "pcm",
  OPUS: "opus",
  MP3: "mp3",
  WAV: "wav",
} as const;

export type AudioEncoding = (typeof AudioEncoding)[keyof typeof AudioEncoding];

// ============ Interfaces ============
export interface AudioConfig {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  encoding: AudioEncoding;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  duration: number;
  sequence: number;
  config: AudioConfig;
}

export interface TranscribeRequest {
  audio: Buffer;
  config: AudioConfig;
  language?: string;
  prompt?: string;
}

export interface TranscribeResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  words?: TranscribeWord[];
}

export interface TranscribeWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SynthesizeRequest {
  text: string;
  voiceId?: string;
  language?: string;
  speed?: number;
}

export interface SynthesizeResult {
  audio: Buffer;
  duration: number;
  format: AudioEncoding;
  sampleRate: number;
}

// ============ Zod Schemas ============
export const AudioConfigSchema = z.object({
  sampleRate: z.number().int().positive(),
  bitDepth: z.number().int().positive(),
  channels: z.number().int().min(1).max(2),
  encoding: z.enum(["pcm", "opus", "mp3", "wav"]),
});

export const TranscribeRequestSchema = z.object({
  audio: z.instanceof(Buffer),
  config: AudioConfigSchema,
  language: z.string().optional(),
  prompt: z.string().optional(),
});
```

#### src/types/gateway.ts

```typescript
import { z } from "zod";

// ============ Interfaces ============
export interface GatewayConfig {
  host: string;
  port: number;
  token?: string;
  secure: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export interface GatewayMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  sessionId?: string;
}

export interface SessionInfo {
  id: string;
  channel: string;
  model: string;
  tokensUsed: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface GatewayStatus {
  connected: boolean;
  uptime: number;
  sessionsCount: number;
  version: string;
}

// WebSocket message types
export type WSMessageType =
  | "ping"
  | "pong"
  | "auth"
  | "auth.success"
  | "auth.error"
  | "message"
  | "message.ack"
  | "session.create"
  | "session.end"
  | "error";

// ============ Zod Schemas ============
export const GatewayConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  token: z.string().optional(),
  secure: z.boolean(),
  reconnectAttempts: z.number().int().min(0).default(5),
  reconnectDelay: z.number().int().min(100).default(1000),
});

export const GatewayMessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
  timestamp: z.number(),
  sessionId: z.string().optional(),
});
```

#### src/types/index.ts

```typescript
// Re-export all types
export * from "./common";
export * from "./device";
export * from "./audio";
export * from "./gateway";
```

### Step 5: Create Utility Files

#### src/utils/logger.ts

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  level: LogLevel;
  prefix: string;
  timestamps: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const defaultConfig: LoggerConfig = {
  level: "info",
  prefix: "[UE-Bot]",
  timestamps: true,
};

export function createLogger(config: Partial<LoggerConfig> = {}) {
  const cfg = { ...defaultConfig, ...config };
  const minLevel = LOG_LEVELS[cfg.level];

  const formatMessage = (level: LogLevel, message: string): string => {
    const parts: string[] = [];
    if (cfg.timestamps) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    parts.push(cfg.prefix);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);
    return parts.join(" ");
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (LOG_LEVELS.debug >= minLevel) {
        console.debug(formatMessage("debug", message), ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (LOG_LEVELS.info >= minLevel) {
        console.info(formatMessage("info", message), ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (LOG_LEVELS.warn >= minLevel) {
        console.warn(formatMessage("warn", message), ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (LOG_LEVELS.error >= minLevel) {
        console.error(formatMessage("error", message), ...args);
      }
    },
  };
}

export const logger = createLogger();
```

#### src/utils/validation.ts

```typescript
import { z } from "zod";

import type { Result } from "../types/common";

export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
): Result<T, z.ZodError> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

export function assertValid<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isValidMacAddress(value: string): boolean {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(value);
}

export function isValidIPAddress(value: string): boolean {
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(value);
}
```

#### src/utils/helpers.ts

```typescript
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function retry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delay?: number; backoff?: number } = {},
): Promise<T> {
  const { attempts = 3, delay: baseDelay = 1000, backoff = 2 } = options;

  return new Promise((resolve, reject) => {
    const attempt = async (attemptsLeft: number, currentDelay: number) => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        if (attemptsLeft <= 1) {
          reject(error);
          return;
        }

        await delay(currentDelay);
        attempt(attemptsLeft - 1, currentDelay * backoff);
      }
    };

    attempt(attempts, baseDelay);
  });
}
```

#### src/utils/index.ts

```typescript
export * from "./logger";
export * from "./validation";
export * from "./helpers";
```

### Step 6: Create Constants

#### src/constants/audio.ts

```typescript
export const AUDIO_CONSTANTS = {
  // Default audio configuration
  DEFAULT_SAMPLE_RATE: 16000,
  DEFAULT_BIT_DEPTH: 16,
  DEFAULT_CHANNELS: 1,
  DEFAULT_ENCODING: "pcm" as const,

  // Limits
  MAX_AUDIO_DURATION_MS: 30000, // 30 seconds
  MIN_AUDIO_DURATION_MS: 100, // 100ms
  MAX_AUDIO_SIZE_BYTES: 10 * 1024 * 1024, // 10MB

  // Streaming
  CHUNK_SIZE_MS: 100,
  BUFFER_SIZE_MS: 500,

  // Whisper settings
  WHISPER_MODEL: "whisper-1",
  WHISPER_MAX_TOKENS: 4096,
} as const;
```

#### src/constants/device.ts

```typescript
export const DEVICE_CONSTANTS = {
  // Connection
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY_MS: 1000,
  HEARTBEAT_INTERVAL_MS: 30000,
  CONNECTION_TIMEOUT_MS: 10000,

  // Wake word
  DEFAULT_WAKE_WORD: "hey bot",
  WAKE_WORD_SENSITIVITY: 0.5,

  // Audio
  DEFAULT_VOLUME: 70,
  MAX_VOLUME: 100,
  MIN_VOLUME: 0,

  // ESP32 specific
  ESP32_BUFFER_SIZE: 1024,
  ESP32_SAMPLE_RATE: 16000,
} as const;
```

#### src/constants/index.ts

```typescript
export * from "./audio";
export * from "./device";
```

### Step 7: Create Main Export

#### src/index.ts

```typescript
// Types
export * from "./types";

// Utils
export * from "./utils";

// Constants
export * from "./constants";
```

### Step 8: Create README.md

````markdown
# @ue-bot/shared

Shared types, utilities, and constants for UE-Bot project.

## Installation

This is an internal package and is automatically available in the monorepo.

## Usage

```typescript
// Import types
import type { Device, AudioConfig, GatewayMessage } from "@ue-bot/shared";

// Import utilities
import { logger, validate, delay, retry } from "@ue-bot/shared";

// Import constants
import { AUDIO_CONSTANTS, DEVICE_CONSTANTS } from "@ue-bot/shared";

// Or import from specific paths
import type { Device } from "@ue-bot/shared/types";
import { logger } from "@ue-bot/shared/utils";
import { AUDIO_CONSTANTS } from "@ue-bot/shared/constants";
```
````

## Structure

- `types/` - TypeScript type definitions with Zod schemas
- `utils/` - Utility functions (logger, validation, helpers)
- `constants/` - Shared constants

## Building

```bash
pnpm build      # Build the package
pnpm dev        # Watch mode
pnpm typecheck  # Type check
pnpm test       # Run tests
```

````

---

## Verification Checklist
- [ ] `pnpm build` completes successfully
- [ ] All types are exported correctly
- [ ] Zod schemas validate data properly
- [ ] Logger utility works
- [ ] Package can be imported in other packages

---

## Git Commit
```bash
git add .
git commit -m "feat(shared): create shared package with types and utils [T005]"
git push
````

---

## Notes

- Zod được sử dụng cho runtime validation
- Types và Schemas cùng file để dễ maintain
- Logger có thể được extend sau với winston/pino
