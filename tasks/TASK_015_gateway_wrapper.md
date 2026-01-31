# TASK-015: Create Gateway Wrapper Service

## Task Information

- **ID**: T015
- **Phase**: 2 - Core Integration
- **Priority**: High
- **Estimated Hours**: 6h
- **Dependencies**: T013, T014

---

## Objective

Tạo một wrapper service trong bridge-service để abstract việc giao tiếp với Moltbot Gateway, cung cấp API thống nhất cho cả webapp và ESP32 devices.

---

## Acceptance Criteria

- [ ] GatewayService class được tạo với đầy đủ methods
- [ ] Connection pooling và reconnection logic
- [ ] Message queue cho reliability
- [ ] Error handling và retry mechanism
- [ ] Unit tests coverage > 80%
- [ ] API documentation

---

## Background

Gateway Wrapper Service đóng vai trò trung gian giữa clients (webapp, ESP32) và Moltbot Gateway, cung cấp:

- Abstraction layer cho Gateway API
- Connection management
- Message buffering
- Error recovery

### Architecture

```
┌─────────────┐     ┌───────────────────────┐     ┌─────────────┐
│   Webapp    │────►│                       │────►│   Moltbot   │
└─────────────┘     │   Gateway Wrapper     │     │   Gateway   │
                    │      Service          │     │             │
┌─────────────┐     │                       │     │  - Sessions │
│   ESP32     │────►│  - Connection Pool    │────►│  - Agents   │
│   Devices   │     │  - Message Queue      │     │  - Channels │
└─────────────┘     │  - Error Recovery     │     └─────────────┘
                    └───────────────────────┘
```

---

## Instructions

### Step 1: Create Gateway Service

Tạo file `packages/bridge-service/src/services/gateway.service.ts`:

```typescript
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import type {
  WebChatRequest,
  WebChatResponse,
  WebChatSession,
  GatewayConfig,
} from '@ue-bot/shared';

export interface GatewayServiceConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  messageTimeout: number;
  healthCheckInterval: number;
}

const defaultConfig: GatewayServiceConfig = {
  url: 'ws://localhost:18789',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  messageTimeout: 30000,
  healthCheckInterval: 30000,
};

export class GatewayService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: GatewayServiceConfig;
  private reconnectAttempts = 0;
  private isConnected = false;
  private messageQueue: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<GatewayServiceConfig> = {}) {
    super();
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Connect to Moltbot Gateway
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.on('open', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          logger.info({ url: this.config.url }, 'Connected to Gateway');
          this.startHealthCheck();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', (code, reason) => {
          this.isConnected = false;
          this.stopHealthCheck();
          logger.warn({ code, reason: reason.toString() }, 'Gateway connection closed');
          this.emit('disconnected', { code, reason: reason.toString() });
          this.attemptReconnect();
        });

        this.ws.on('error', (error) => {
          logger.error({ error }, 'Gateway connection error');
          this.emit('error', error);
          if (!this.isConnected) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from Gateway
   */
  async disconnect(): Promise<void> {
    this.stopHealthCheck();
    this.reconnectAttempts = this.config.maxReconnectAttempts; // Prevent reconnection

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;

    // Reject all pending messages
    for (const [id, pending] of this.messageQueue) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.messageQueue.clear();
  }

  /**
   * Send chat message and get response
   */
  async sendMessage(request: WebChatRequest): Promise<WebChatResponse> {
    if (!this.isConnected) {
      throw new Error('Not connected to Gateway');
    }

    const messageId = this.generateMessageId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageQueue.delete(messageId);
        reject(new Error('Message timeout'));
      }, this.config.messageTimeout);

      this.messageQueue.set(messageId, { resolve, reject, timeout });

      this.send({
        type: 'webchat.message',
        id: messageId,
        payload: request,
      });
    });
  }

  /**
   * Create a new chat session
   */
  async createSession(userId?: string): Promise<WebChatSession> {
    if (!this.isConnected) {
      throw new Error('Not connected to Gateway');
    }

    const messageId = this.generateMessageId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageQueue.delete(messageId);
        reject(new Error('Create session timeout'));
      }, this.config.messageTimeout);

      this.messageQueue.set(messageId, { resolve, reject, timeout });

      this.send({
        type: 'webchat.createSession',
        id: messageId,
        payload: { userId },
      });
    });
  }

  /**
   * Get session info
   */
  async getSession(sessionId: string): Promise<WebChatSession | null> {
    if (!this.isConnected) {
      throw new Error('Not connected to Gateway');
    }

    const messageId = this.generateMessageId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageQueue.delete(messageId);
        reject(new Error('Get session timeout'));
      }, this.config.messageTimeout);

      this.messageQueue.set(messageId, { resolve, reject, timeout });

      this.send({
        type: 'webchat.getSession',
        id: messageId,
        payload: { sessionId },
      });
    });
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Gateway');
    }

    this.send({
      type: 'webchat.endSession',
      payload: { sessionId },
    });
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const messageId = this.generateMessageId();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.messageQueue.delete(messageId);
          reject(new Error('Health check timeout'));
        }, 5000);

        this.messageQueue.set(messageId, {
          resolve: () => resolve(),
          reject,
          timeout,
        });

        this.send({ type: 'ping', id: messageId });
      });

      return true;
    } catch {
      return false;
    }
  }

  // Private methods

  private send(message: unknown): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle response to pending request
      if (message.id && this.messageQueue.has(message.id)) {
        const pending = this.messageQueue.get(message.id)!;
        clearTimeout(pending.timeout);
        this.messageQueue.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.payload);
        }
        return;
      }

      // Handle events
      switch (message.type) {
        case 'pong':
          // Health check response - handled above
          break;
        case 'webchat.typing':
          this.emit('typing', message.payload);
          break;
        case 'webchat.message':
          this.emit('message', message.payload);
          break;
        default:
          logger.debug({ type: message.type }, 'Unhandled message type');
      }
    } catch (error) {
      logger.error({ error, data }, 'Failed to parse message');
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    logger.info(
      { attempt: this.reconnectAttempts, max: this.config.maxReconnectAttempts },
      'Attempting to reconnect...'
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        logger.error({ error }, 'Reconnection failed');
      });
    }, this.config.reconnectInterval);
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      const healthy = await this.healthCheck();
      if (!healthy) {
        logger.warn('Health check failed');
        this.emit('unhealthy');
      }
    }, this.config.healthCheckInterval);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// Singleton instance
let gatewayServiceInstance: GatewayService | null = null;

export function getGatewayService(config?: Partial<GatewayServiceConfig>): GatewayService {
  if (!gatewayServiceInstance) {
    gatewayServiceInstance = new GatewayService(config);
  }
  return gatewayServiceInstance;
}
```

### Step 2: Add Gateway Types to Shared Package

Cập nhật `packages/shared/src/types/gateway.ts`:

```typescript
// Add to existing file

export interface GatewayConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  messageTimeout: number;
  healthCheckInterval: number;
}

export interface GatewayMessage {
  type: string;
  id?: string;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

export interface GatewayStatus {
  connected: boolean;
  latency: number;
  uptime: number;
  sessionsCount: number;
}
```

### Step 3: Create Unit Tests

Tạo file `packages/bridge-service/src/services/__tests__/gateway.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GatewayService } from '../gateway.service';

// Mock WebSocket
vi.mock('ws', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
    })),
  };
});

describe('GatewayService', () => {
  let service: GatewayService;

  beforeEach(() => {
    service = new GatewayService({
      url: 'ws://localhost:18789',
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
    });
  });

  afterEach(async () => {
    await service.disconnect();
  });

  describe('getConnectionStatus', () => {
    it('should return disconnected status initially', () => {
      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.reconnectAttempts).toBe(0);
    });
  });

  describe('sendMessage', () => {
    it('should throw error when not connected', async () => {
      await expect(service.sendMessage({ message: 'test' })).rejects.toThrow(
        'Not connected to Gateway'
      );
    });
  });

  describe('createSession', () => {
    it('should throw error when not connected', async () => {
      await expect(service.createSession()).rejects.toThrow('Not connected to Gateway');
    });
  });
});
```

### Step 4: Export Service from Bridge Service

Cập nhật `packages/bridge-service/src/services/index.ts`:

```typescript
export { GatewayService, getGatewayService } from './gateway.service';
export type { GatewayServiceConfig } from './gateway.service';
```

### Step 5: Integrate with Server

Cập nhật `packages/bridge-service/src/server.ts` để khởi tạo Gateway service:

```typescript
import { getGatewayService } from './services/gateway.service';

// In Server class constructor or start method:
private async initGatewayService(): Promise<void> {
  const gateway = getGatewayService({
    url: config.MOLTBOT_URL,
    messageTimeout: config.GATEWAY_TIMEOUT,
  });

  gateway.on('connected', () => {
    logger.info('Gateway service connected');
  });

  gateway.on('disconnected', () => {
    logger.warn('Gateway service disconnected');
  });

  gateway.on('error', (error) => {
    logger.error({ error }, 'Gateway service error');
  });

  await gateway.connect();
}
```

---

## API Reference

### GatewayService Methods

| Method                   | Parameters       | Returns                    | Description        |
| ------------------------ | ---------------- | -------------------------- | ------------------ |
| `connect()`              | -                | `Promise<void>`            | Connect to Gateway |
| `disconnect()`           | -                | `Promise<void>`            | Disconnect         |
| `sendMessage(request)`   | `WebChatRequest` | `Promise<WebChatResponse>` | Send chat message  |
| `createSession(userId?)` | `string?`        | `Promise<WebChatSession>`  | Create session     |
| `getSession(sessionId)`  | `string`         | `Promise<WebChatSession>`  | Get session        |
| `endSession(sessionId)`  | `string`         | `Promise<void>`            | End session        |
| `healthCheck()`          | -                | `Promise<boolean>`         | Check health       |
| `getConnectionStatus()`  | -                | `ConnectionStatus`         | Get status         |

### Events

| Event          | Payload            | Description          |
| -------------- | ------------------ | -------------------- |
| `connected`    | -                  | Connected to Gateway |
| `disconnected` | `{ code, reason }` | Disconnected         |
| `error`        | `Error`            | Connection error     |
| `message`      | `WebChatMessage`   | New message          |
| `typing`       | `{ isTyping }`     | Typing indicator     |

---

## Verification Checklist

- [ ] GatewayService class created
- [ ] All methods implemented
- [ ] Event emitter pattern working
- [ ] Reconnection logic implemented
- [ ] Message queue with timeouts
- [ ] Unit tests written
- [ ] Types exported from shared
- [ ] Integrated with server

---

## Related Tasks

- **T013**: Configure Moltbot Gateway (prerequisite)
- **T014**: Setup WebChat channel (prerequisite)
- **T016**: Implement health checks (uses this service)
- **T021**: Implement WebSocket client (uses this service)
